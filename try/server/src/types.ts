import { Request, Response  } from "express";
import { Redis } from "ioredis";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserLoader } from "./utils/createUserLoader";
// import { createUserLoader } from "./utils/createUserLoader";
// import { createUpdootLoader } from "./utils/createUpdootLoader";



export type MyContext = {
  req: Request & { session: {userId:any} };
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  updootLoader: ReturnType<typeof createUpdootLoader>;
};