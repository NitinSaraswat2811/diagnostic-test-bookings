const pool = require("../config/db");

async function createTestController(req,res){
    const { name, description } = req.body;
     
    const existingTest = await pool.query(
    `SELECT id FROM diagnostic_tests
     WHERE name = $1`,
    [name]
);

if (existingTest.rows.length > 0) {
    return res.status(409).json({
        message: "Test already exists"
    });
}
    const result = await pool.query(
        `INSERT INTO diagnostic_tests (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at`,
    [name, description]
    );

    return res.status(201).json({
    message: "Test created",
    test: result.rows[0]
});
}

async function getAllTestsController(req,res){
     const result = await pool.query(
        `SELECT id, name, description, created_at
         FROM diagnostic_tests
         ORDER BY id`
    );

    return res.status(200).json({
        tests: result.rows
    }); 
}

async function getTestByIdController(req,res){
    const {id} = req.params;

    const result = await pool.query(
        `SELECT id,name,description,created_at
        FROM diagnostic_tests
        WHERE id = $1`,
        [id]
    )
    return res.status(200).json({
        test:result.rows[0]
    })
}

module.exports = {
    createTestController,
    getAllTestsController,
    getTestByIdController
}