import express from 'express'
import { createServer } from 'http'
import { PubSub } from 'graphql-subscriptions'
import gql from 'graphql-tag'

(
    async function () {
        const pubSub = new PubSub()
        const app = express()
        const http = createServer(app)

        const typeDefs = gql`
            type NewsEvent {
                title: String
                description: String
            }

            type Query {
                placeholder: Boolean
            }

            type Mutation {
                createNewsEvent(title: String, description: String): NewsEvent
            }
        `
    }
)()