import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"

export const middleware = (req: Request, res: Response, next: NextFunction) =>{
    const token = req.headers.authorization as string
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }
    req.userId = decoded.id

    next();
}