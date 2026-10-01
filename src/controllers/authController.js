const pool = require("../config/db");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');



async function userRegisterController(req,res){
    const { email, password, name} = req.body;
    
    if (!name || !email || !password) {
    return res.status(400).json({
        message: "Name, email and password are required",
        status: "failed"
    });
}

    const result = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
);

  if(result.rows.length>0){
    return res.status(422).json({
        message: "User already exists",
        status: "failed"
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const Createduser = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at`,
    [name, email, hashedPassword]
);

const user = Createduser.rows[0];

const token = jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:"5d"});

res.status(201).json({
    user:{
        id: user.id,
        email:email,
        name:name
    },
    token
})
}

async function userLoginController(req,res) {
    const {email,password} = req.body;
     
    const result = await pool.query(
    "SELECT id,email,password FROM users WHERE email = $1",
    [email]
);

if(result.rows.length==0){
    return res.status(401).json({
        message:"Email or password is incorrect",
    })
}
 
const user = result.rows[0];

const isValidPassword = await bcrypt.compare(password,user.password);

if (!isValidPassword) {
    return res.status(401).json({
        message: "Email or password is incorrect"
    });
}
const token = jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:"5d"});

res.status(200).json({
    user:{
        id:user.id,
        email:email,
    },
    token
})
}

module.exports = {
    userRegisterController,
    userLoginController
};