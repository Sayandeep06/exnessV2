import express from 'express'
import z from 'zod'
import jwt from 'jsonwebtoken'
import { RedisClient } from '../RedisManager'

export const userRouter = express.Router()

const signupSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6)
})

const signinSchema = z.object({
    username: z.string(),
    password: z.string()
})


const users: any[] = []
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

userRouter.post('/signup', async (req, res) => {
    try {
        const data = signupSchema.safeParse(req.body)
        
        if (!data.success) {
            return res.status(411).json({
                message: "Incorrect inputs"
            })
        }

        const existingUser = users.find(u => u.username === data.data.username || u.email === data.data.email)
        if (existingUser) {
            return res.status(403).json({
                message: "User already exists"
            })
        }

        
        const userId = users.length + 2; 
        
        const newUser = {
            userId: userId,
            username: data.data.username,
            email: data.data.email,
            password: data.data.password,
            usdBalance: 10000 
        }
        
        users.push(newUser)

        
        const redisClient = RedisClient.getInstance()
        const createUserMessage = {
            action: 'create_user',
            data: {
                userId: userId,
                username: data.data.username,
                email: data.data.email,
                startingBalance: 10000
            }
        }
        
        try {
            await redisClient.publishSubscribe(JSON.stringify(createUserMessage))
        } catch (engineError) {
            console.error('Failed to create user in engine:', engineError)
            
        }

        res.status(200).json({
            success: true,
            userId: userId,
            username: data.data.username,
            message: "User created successfully"
        })
        
    } catch (error) {
        console.error('Signup error:', error)
        res.status(403).json({
            message: "Error while signing up"
        })
    }
})

userRouter.post('/signin', async (req, res) => {
    try {
        const data = signinSchema.safeParse(req.body)
        
        if (!data.success) {
            return res.status(403).json({
                message: "Incorrect credentials"
            })
        }

        const user = users.find(u => u.username === data.data.username && u.password === data.data.password)
        
        if (!user) {
            return res.status(403).json({
                message: "Incorrect credentials"
            })
        }

        const token = jwt.sign({
            userId: user.userId,
            username: user.username,
            email: user.email
        }, JWT_SECRET, { expiresIn: '24h' })

        res.status(200).json({
            success: true,
            token: token,
            user: {
                userId: user.userId,
                username: user.username,
                email: user.email
            }
        })
        
    } catch (error) {
        console.error('Signin error:', error)
        res.status(403).json({
            message: "Incorrect credentials"
        })
    }
})

userRouter.get('/balance', async (req, res) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, JWT_SECRET) as any
        const user = users.find(u => u.id === decoded.userId)
        
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        res.status(200).json({
            usd_balance: user.usdBalance
        })
        
    } catch (error) {
        res.status(401).json({
            message: "Unauthorized"
        })
    }
})