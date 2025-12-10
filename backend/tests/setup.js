import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo;

export const setupTestEnv = async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    await mongoose.connect(uri, {
        dbName: 'testdb'
    });
}

export const cleanupDatabase = async () => {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

export const closeTestEnv = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
};