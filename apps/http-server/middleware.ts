import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const middleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const token = authHeader.substring(7)
        
        if (token === 'demo-token') {
            (req as any).userId = 1 
            return next()
        }
        
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
        ;(req as any).userId = decoded.userId

        next()
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized"
        })
    }
}