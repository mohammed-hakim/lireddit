import 'reflect-metadata'
import {createConnection} from "typeorm"
import { COOKIE_NAME, __prod__ } from "./constants"
import express from "express";
import {ApolloServer} from 'apollo-server-express'
import {buildSchema} from 'type-graphql'
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import session from "express-session";
import Redis from "ioredis";
import connectRedis from"connect-redis"
import { MyContext } from "./types";
import cors from 'cors'
import { User } from "./entities/User";
import { Post } from "./entities/Post";

import path from 'path'
import { Updoot } from './entities/Updoot';
import { createUserLoader } from './utils/createUserLoader';
import { createUpdootLoader } from './utils/createUpdootLoader';
const main = async() => {


    const conn = await createConnection({
        type:'postgres',
        database:'lireddit2',
        username:'postgres',
        password:'admin',
        logging:true,
        synchronize: true,
        migrations:[path.join(__dirname, './migrations/*')],
        entities:[Post , User , Updoot]
    })

    // await conn.runMigrations()

    // let ps =  await Post.find({})
    // for (let i = 0; i < ps.length; i++) {
    //     let x = ps[i];
    //     let c = new Date((new Date("2023-01-30T16:32:51.114Z")).getTime()+i*1000).toISOString()
    //     await Post.update({id:x.id} , {createdAt:c})
    //     console.log({i});
        
     
    // }

    // Post.delete({})

    const app = express()


    

    let RedisStore = connectRedis(session)
    let redisClient = new Redis()
    app.use(cors({origin:"http://localhost:3000" , credentials:true}))
    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({
                client: redisClient,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true, // not access from js
                sameSite: "lax", // csrf
                secure: __prod__, // cookie only works in https
                // domain: __prod__ ? ".codeponder.com" : undefined,
            },
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET || "6887565v7vtuygha87b786baaokjfd",
            resave: false,
        })
      )
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers:[HelloResolver ,PostResolver , UserResolver],
            validate:false
        }),
        context:({req , res}):MyContext=> ({ req , res , redis:redisClient , userLoader:createUserLoader() , updootLoader:createUpdootLoader()})
    })
    
    apolloServer.applyMiddleware({app , cors:false})

    


    app.listen(4000, ()=>{
        console.log('server started on localhost:4000');
    })
}


main().catch((err)=>{
    console.error(err);
    
})