import express from 'express'
import z from 'zod'
import jwt from 'jsonwebtoken'

export const userRouter = express.Router()

const signupSchema = z.object({
    email: z.email(),
    password: z.string().min(6)
})

const signinSchema = z.object({
    email: z.email(),
    password: z.string()
})

const users: any[] = []
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

userRouter.post('/user/signup', async (req, res) => {
    try {
        const data = signupSchema.safeParse(req.body)
        
        if (!data.success) {
            return res.status(411).json({
                message: "Incorrect inputs"
            })
        }

        const existingUser = users.find(u => u.email === data.data.email)
        if (existingUser) {
            return res.status(403).json({
                message: "Error while signing up"
            })
        }

        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newUser = {
            id: userId,
            email: data.data.email,
            password: data.data.password,
            usdBalance: 500000
        }
        
        users.push(newUser)

        res.status(200).json({
            userId: userId
        })
        
    } catch (error) {
        res.status(403).json({
            message: "Error while signing up"
        })
    }
})

userRouter.post('/user/signin', async (req, res) => {
    try {
        const data = signinSchema.safeParse(req.body)
        
        if (!data.success) {
            return res.status(403).json({
                message: "Incorrect credentials"
            })
        }

        const user = users.find(u => u.email === data.data.email && u.password === data.data.password)
        
        if (!user) {
            return res.status(403).json({
                message: "Incorrect credentials"
            })
        }

        const token = jwt.sign({
            userId: user.id,
            email: user.email
        }, JWT_SECRET, { expiresIn: '24h' })

        res.status(200).json({
            token: token
        })
        
    } catch (error) {
        res.status(403).json({
            message: "Incorrect credentials"
        })
    }
})

userRouter.get('/user/balance', async (req, res) => {
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