import { User } from "../entities/User";
import { Arg, Ctx, Field, FieldResolver, InputType, Mutation, ObjectType, Query, Resolver, Root } from "type-graphql";
import { MyContext } from "../types";
import  argon2 from 'argon2'
import {COOKIE_NAME, FORGET_PASSWORD_PREFIX} from '../constants'
import { v4 } from "uuid";
import { sendEmail } from "../utils/sendEmail";

@InputType()
class userInfoInput  {
    @Field()
    usernameOrEmail : string
    email : string
    @Field()
    password : string
}
@InputType()
class userInfoInputRegister  {
    @Field(()=>String)
    username : string
    @Field(()=>String)
    email : string
    @Field()
    password : string
}
@ObjectType()
class UserResponse  {
    @Field(()=> [FieldError] , {nullable : true})
    errors? : FieldError[]
    @Field(()=> User , {nullable : true})
    user? : User
}
@ObjectType()
class FieldError  {
    @Field()
    field? : string
    @Field()
    message? : string

}

@Resolver(User)
export class UserResolver {
    
    @FieldResolver(()=>String)
    email(
        @Root() user:User,
        @Ctx() {req}:MyContext
    ){
        if(req.session.userId == user.id){
            return user.email
        }
        else {
            return ""
        }
    }

    @Query(()=> User , {nullable:true})
    async user(
        @Arg("id") id :number,
    ) : Promise<User | undefined>
    {
        return await User.findOne(id)
    }
    @Query(()=> User , {nullable:true})
    async me(
        @Ctx() { req} : MyContext
    ) : Promise<User | null | undefined>
    {
        
        if(!req.session.userId){
            return null
        }

        return await User.findOne(req.session.userId)
    }

    @Mutation(()=> Boolean)
    async logout(
        @Ctx() { req , res} : MyContext
    ) 
    {
       return new Promise((resolve)=>{
         req.session.destroy((err:any)=>{
            if(err){
                resolve(false)
                return
            }
            res.clearCookie(COOKIE_NAME)
            resolve(true)
        })
       }) 
    }
    @Mutation(()=> Boolean)
    async forgotPassword(
        @Arg('email') email:string,
        @Ctx() {req , res , redis} : MyContext
    ) 
    {

        const user = await User.findOne({where:{email}})

        if (!user) return true;
        let TOKEN = v4();
        let datys_3 = 60 * 60 * 24 * 3;
        let key = FORGET_PASSWORD_PREFIX + TOKEN;
    
        await redis.set(key, user.id, 'ex', datys_3);
        let URL = 'http://localhost:3000'
        let a = `${URL}/change-password/${TOKEN}"`;
        console.log({a});
      
        sendEmail(email, a);
        return true;
    }
    
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req  }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "length must be greater than 2",
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "token expired",
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum)

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "user no longer exists",
          },
        ],
      };
    }

    // await User.update(
    //   { id: userIdNum },
    //   {
    //     password: await argon2.hash(newPassword),
    //   }
    // );

    
    let password = await argon2.hash(newPassword)
    user.password = password
    await User.update({id:userIdNum},{password})


    await redis.del(key);

    // log in user after change password
    req.session.userId = userIdNum;

    return { user };
  }

    @Query(()=> [User] , {nullable:true})
    async users(
    ) : Promise<User[] | null>
    {
        return await User.find()
    }


    @Mutation(()=> UserResponse )
    async register(
        @Arg("data" , () =>  userInfoInputRegister ) data : userInfoInputRegister ,
        @Ctx() { req} : MyContext
    ) : Promise<UserResponse>
    {
        try {
            
            let errors = []
            if(!data.email.includes('@')){
  
                
                errors.push(
                 {
                     field:'email',
                     message:'invalid email'
                 }
             )
             }
            if(data.username.length < 4){
               errors.push(
                {
                    field:'username',
                    message:'username too short'
                }
            )
            }
            if(data.password.length < 6){
                errors.push(

                {
                    field:'password',
                    message:'password too short'
                }
            )
            }
            if(errors.length){
                return {errors}
            }

            data.password = await argon2.hash(data.password);
            let user = User.create(data)
            console.log({user});
            
            await user.save()

            //login the user
            req.session.userId = user.id;

           return {user}
        } catch (error) {
            console.error(error);
            console.log(error.constraint);
            if(error.code == "23505"){
                //duplicate username
                return {errors:[
                {
                    field:'username',
                    message:'that username already exist'
                }
            ]}
            }
            
            throw(error)
            
        }
       
    }


    @Mutation(()=> UserResponse )
    async login(
        @Arg("data") data :userInfoInput,
        @Ctx() { req} : MyContext
    ) : Promise<UserResponse>   
    {
        let info = !data.usernameOrEmail.includes("@")?'username':'email'
        let dt = {}as any
        dt[info] = data.usernameOrEmail
        console.log({dt});
        
        let user = await User.findOne({where:dt})
        console.log({user});
        
        if(!user) return {  errors : [
            {
            field:'usernameOrEmail',
            message:`that ${info} doest not exist`
        }]}

        
      
        let valid = await argon2.verify(user.password, data.password)
        if(!valid) return {  errors : [{
            field:'password',
            message:'inccorect password'
        }]}

        req.session.userId = user.id;

        
        return {user}
    }
    @Mutation(()=> User , {nullable: true} )
    async editUser(
        @Arg("username" , ()=> String , {nullable : true}) username :string,
        @Arg("id") id :number,
        ) : Promise<User | null>
    {
        
        let user = await User.findOne( id)
        if(!user){
            return null
        }
        else {

            user.username = username
            await User.update({id:user.id},{username})
        
        }
       
        
        return user
    }

    
    @Mutation(()=> Boolean , {nullable: true} )
    async deleteUser(
        @Arg("id") id :number,
    ) : Promise<boolean>
    {
     
        await User.delete(id)
        
        return true
    }
}