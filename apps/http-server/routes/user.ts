import express from 'express'
import z from 'zod'
export const userRouter = express.Router()
import { prisma } from 'db'
import jwt from 'jsonwebtoken'

const userSchema = z.object({
    username: z.email(),
    password: z.string()
})

userRouter.post('/signup', async (req, res) => {
    try{    
        const data = userSchema.safeParse(req.body)
        const user = await prisma.user.create({
            data: {
                username: data?.data?.username,
                password: data?.data?.password
            }
        })
        res.json({
            success: true,
            user: user.id
        })
   }catch(error){
        res.json({
            success: false,
            error: error
        })
   }
})

userRouter.post('/signin', async (req, res) => {
    try{
        const data = userSchema.safeParse(req.body)
        const user = await prisma.user.findFirst({
            data: {
                username: data?.data?.username,
                password: data?.data?.password
            }
        })

        const token = jwt.sign({
            id: user.id
        }, process.env.JWT_SECRET!)

        res.json({
            success: true,
            user: user.username,
            token
        })
   }catch(error){
        res.json({
            success: false,
            error: error
        })
   }  
})

