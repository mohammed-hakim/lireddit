import { User } from "../entities/User";
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { getConnection } from 'typeorm';
import { Post } from "../entities/Post";
import { Updoot } from '../entities/Updoot';
import { MyContext } from "../types";
import { isAuth } from './../middleware/isAuth';

const sleep = (ms:number)=> new Promise((res)=> setTimeout(res, ms))

@InputType()
class PostInput {
    @Field()
    title:string
    @Field()
    text:string
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}



@Resolver(Post)
export class PostResolver {
    @FieldResolver(()=>String)
    textSnippet(
        @Root() root:Post
    ){
        return root.text.slice(0,50)+'...'
    }
    @FieldResolver(() => User)
    creator(@Root() post: Post,
     @Ctx() { userLoader }: MyContext
     ) {
      // return User.findOne(post.creatorId)
      return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, { nullable: true })
    async voteStatus(
      @Root() post: Post,
      @Ctx() { updootLoader, req }: MyContext
    ) {
      if (!req.session.userId) {
        return null;
      }
  
      const updoot = await updootLoader.load({
        postId: post.id,
        userId: req.session.userId,
      });
  
      return updoot ? updoot.value : null;
    }


    @Mutation(()=>Boolean)
    @UseMiddleware(isAuth)
    async vote (
        @Arg('postId', () =>Int) postId : number,
        @Arg('value', () =>Int) up : number,
        @Ctx() {req} : MyContext
    ){
       

        const isUpdoot = up !== -1;
        const realValue = isUpdoot ? 1 : -1;
        const { userId } = req.session;
    
        const updoot = await Updoot.findOne({ where: { postId, userId } });
    
        // the user has voted on the post before
        // and they are changing their vote
        if (updoot && updoot.value !== realValue) {
          await getConnection().transaction(async (tm) => {
            await tm.query(
              `
        update updoot
        set value = $1
        where "postId" = $2 and "userId" = $3
            `,
              [realValue, postId, userId]
            );
    
            await tm.query(
              `
              update post
              set points = points + $1
              where id = $2
            `,
              [2 * realValue, postId]
            );
          });
        } else if (!updoot) {
          // has never voted before
          await getConnection().transaction(async (tm) => {
            await tm.query(
              `
        insert into updoot ("userId", "postId", value)
        values ($1, $2, $3)
            `,
              [userId, postId, realValue]
            );
    
            await tm.query(
              `
        update post
        set points = points + $1
        where id = $2
          `,
              [realValue, postId]
            );
          });
        }
        return true;
    }


    @Query(()=> Post , {nullable:true})
    async post(
        @Arg("id",()=>Int) id :number,
        @Ctx() {req} :MyContext,
    ) : Promise<Post | undefined>
    {
     
       let post = await Post.findOne(id /* , {relations:["creator"]} */)
      
        return post
    }

    @Query(()=> PaginatedPosts , {nullable:true})
    async posts(
        @Arg('limit',() => Int, {nullable:true}) limit :number = 5,
        @Arg('cursor',() => String, {nullable:true}) cursor:string | null,
        @Ctx(){req}:MyContext
    ) : Promise<PaginatedPosts>
    {
        
        

        let realLimit = Math.min(50 , limit)
        let realLimitPlus = realLimit+1





        const replacements: any[] = [realLimitPlus];

        if (cursor) {
          replacements.push(cursor /* new Date(parseInt(cursor)) */);
        }
        // let voteStatusChunk = null 
        // if(req.session.userId){
        //   voteStatusChunk = ` (select value from updoot where "userId" = ${req.session.userId} and "postId" = p.id )  "voteStatus"`
        // }
        // ${req.session.userId ? voteStatusChunk: ''}


        const posts = await getConnection().query(
          `
        select p.*
    
       
        from post p
        ${cursor ? `where p."createdAt" < $2` : ""}
        order by p."createdAt" DESC
        limit $1
        `,
          replacements
        );




        // let qb =  await getConnection()
        // .getRepository(Post)
        // .createQueryBuilder("p")
        // .innerJoinAndSelect(
        //     "p.creator",
        //     "u",
        //     'u.id = p."creatorId"'
        // )
        // .orderBy('p."createdAt"' ,"DESC")
        // .take(realLimitPlus)
        // if(cursor){
        //    qb.where('p."createdAt" < :cursor', { cursor }) 
        // }
        // let posts =  await qb.getMany()
        


        

        return {
            posts:posts.slice(0,realLimit), 
            hasMore:posts.length == realLimitPlus
        }
        
    }

    @Mutation(()=> Post )
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("data") data :PostInput,
        @Ctx(){req}:MyContext
    ) : Promise<Post>
    {
    
        
        return Post.create({...data , creatorId:req.session.userId}).save()
        
    }
    @UseMiddleware(isAuth)
    @Mutation(()=> Post , {nullable: true} )
    async updatePost(
        @Arg("title" , ()=> String , {nullable : true}) title :string,
        @Arg("text" , ()=> String , {nullable : true}) text :string,
        @Arg("id",()=>Int) id :number,
        @Ctx() {req}:MyContext
    ) : Promise<Post | null>
    {
        
        let post = await Post.findOne(id,{relations:["creator"]})
        if(!post){
            return null
        }
        else {
          title && (post.title = title)
          text && (post.text = text)
            await Post.update({id , creatorId:req.session.userId ,},
              {title , text })
        }
       
        
        return post
    }

    @UseMiddleware(isAuth)
    @Mutation(()=> Boolean , {nullable: true} )
    async deletePost(
        @Arg("id",()=>Int) id :number,
        @Ctx() {req}:MyContext
    ) : Promise<boolean>
    {
      // const post = await Post.findOne(id)
      // if(!post ){
      //   return false
      // }
      // if(post?.creatorId != req.session.userId){
      //   throw new Error('not authorized')
      // }
    
      // await Updoot.delete({postId:id , userId:req.session.userId})
      await Post.delete({id, creatorId:req.session.userId})
        
      return true
    }
}



/* 

 `
        select p.*,u.* from post p
        inner JOIN "user" u ON u.id = p."creatorId" 
        ${cursor ? `where p."createdAt" < $2` : ""}
        order by p."createdAt" DESC
        limit $1
        `
//////////////////////////////////////////////////////


 `
        select p.*,
        json_build_object('username' , u.username) creator
        from post p
        inner JOIN "user" u ON u.id = p."creatorId" 
        ${cursor ? `where p."createdAt" < $2` : ""}
        order by p."createdAt" DESC
        limit $1
        `,


//////////////////////////////////////////////////////

          `
        select p.*,
        json_build_object(
            'id' , u.id,
            'username' , u.username,
            'email' , u.email
            ) creator
       ${req.session.userId ? voteStatusChunk: ''}
        from post p
        inner JOIN "user" u ON u.id = p."creatorId" 
        ${cursor ? `where p."createdAt" < $2` : ""}
        order by p."createdAt" DESC
        limit $1
        `

*/