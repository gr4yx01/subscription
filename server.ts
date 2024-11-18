import express, { json } from 'express'
import { createServer } from 'http'
import { PubSub } from 'graphql-subscriptions'
import gql from 'graphql-tag'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { expressMiddleware } from '@apollo/server/express4'
import cors from 'cors'

(
    async function () {
        const pubSub = new PubSub()
        const app = express()
        const httpServer = createServer(app)

        interface CreateNewsEventInput {
            title: string
            description: string
        }

        const typeDefs = gql`
            type NewsEvent {
                title: String
                description: String
            }

            type Query {
                placeholder: Boolean
            }

            type Mutation {
                createNewsEvent(title: String!, description: String!): NewsEvent!
            }

            type Subscription {
                newsFeed: NewsEvent
            }
        `

        const resolvers = {
            Query: {
                placeholder: () => {
                    return true
                }
            },
            Mutation: {
                createNewsEvent: (_: any, { title, description }: CreateNewsEventInput) => {
                    pubSub.publish('EVENT_CREATED', { newsFeed: { title, description } })
                    
                    return {
                        title, description
                    }
                }
            },
            Subscription: {
                newsFeed: {
                    subscribe: () => pubSub.asyncIterableIterator(['EVENT_CREATED'])
                }
            }
        }

        const schema = makeExecutableSchema({ typeDefs, resolvers })

        // subscriptions run on websockets and not http

        const wsServer = new WebSocketServer({
            server: httpServer,
            path: '/graphql'
        })

        // future server teardown
        const serverCleanup = useServer({ schema }, wsServer)

        const server = new ApolloServer({
            schema,
            plugins: [
                ApolloServerPluginDrainHttpServer({ httpServer }), // teardown
                {
                    async serverWillStart() {
                        return {
                            async drainServer() {
                                await serverCleanup.dispose()
                            }
                        }
                    }
                }
            ]
        })

        await server.start()

        app.use('/graphql', cors<cors.CorsRequest>(), json(), expressMiddleware(server)) // middlewares 

        httpServer.listen(3000, () => {
            console.log('server running on port 3000')
        })
    }
)()