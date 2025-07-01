// import { DB_NAME } from "./constants";
import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env"
});

connectDB()
    .then( ()  => {
        app.listen(process.env.PORT || 5000,  () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
            
        } )
    })
    .catch( (error) => {
        console.log("MONGO db connection failed !!! ",error);
        
    } )

/*
const app = express();

app.use(express.json());

const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port: ${process.env.PORT}`);
        });
        
    } catch (error) {
        console.log("ERROR: ", error);
        process.exit(1);
    }
};

startServer();

*/