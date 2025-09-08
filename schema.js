const { buildSchema } = require('graphql');

// GraphQL schema definition
module.exports = buildSchema(`
  enum TaskStatus {
    pending
    done
  }

  type File {
    filename: String!
    originalName: String!
    size: Int!
    mimeType: String!
  }

  input FileInput {
    filename: String!
    originalName: String!
    size: Int!
    mimeType: String!
  }

  type Task {
    id: ID!
    title: String!
    dueDate: String!
    status: TaskStatus!
    files: [File!]
    createdAt: String!
    updatedAt: String
  }

  type User {
    id: ID!
    username: String!
    createdAt: String
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type Query {
    me: User
    tasks(status: TaskStatus): [Task!]!
  }

  type Mutation {
    register(username: String!, password: String!): User!
    login(username: String!, password: String!): AuthPayload!
    createTask(title: String!, dueDate: String!, files: [FileInput!]): Task!
    toggleTask(id: ID!): Task!
    deleteTask(id: ID!): Boolean!
  }
`);


