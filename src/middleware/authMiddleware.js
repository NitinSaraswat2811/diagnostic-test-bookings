const jwt = require('jsonwebtoken');
const pool = require("../config/db");

async function authMiddleware(req,res,next){
    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({
            message:"Unauthorized access"
        })
    }

    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        const user = await pool.query(
    "SELECT id, email, name FROM users WHERE id = $1",
    [decoded.userId]
);
        if (user.rows.length === 0) {
    return res.status(401).json({
        message: "Unauthorized access"
    });
}
        req.user = user.rows[0];
        return next();
    }catch(err){
        return res.status(401).json({
            message:"Unauthorized access"
        })
    }
}

module.exports = {
    authMiddleware
}