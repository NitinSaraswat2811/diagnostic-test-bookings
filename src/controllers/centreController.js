const pool = require("../config/db");


async function createCentreController(req,res){
const { name, location } = req.body;
const existingCentre = await pool.query(
    `SELECT id FROM diagnostic_centres
     WHERE name = $1 AND location = $2`,
    [name, location]
);

if (existingCentre.rows.length > 0) {
    return res.status(409).json({
        message: "Centre already exists"
    });
}
const result = await pool.query(
   `INSERT INTO diagnostic_centres (name, location)
 VALUES ($1, $2)
 RETURNING id, name, location, created_at`,
[name, location]
);

return res.status(201).json({
    message:"Centre created",
    centre: result.rows[0]
})
}

async function getAllCentresController(req,res){
   const result = await pool.query(
        `SELECT id, name, location, created_at
         FROM diagnostic_centres
         ORDER BY id`
    );

    return res.status(200).json({
        centres: result.rows
    });
}

async function getCentreByIdController(req,res){
    const { id } = req.params;

    const result = await pool.query(
        `SELECT id, name, location, created_at
         FROM diagnostic_centres
         WHERE id = $1`,
        [id]
    );

    return res.status(200).json({
        centre:result.rows[0]
    })
}
async function getCentreTestsController(req,res){
    const { id } = req.params;

    const result = await pool.query(
        `SELECT
            dt.id,
            dt.name,
            dt.description,
            ct.price
         FROM centre_tests ct
         JOIN diagnostic_tests dt
         ON ct.test_id = dt.id
         WHERE ct.centre_id = $1`,
        [id]
    );
     return res.status(200).json({
        tests: result.rows
    });
}
async function assignTestToCentreController(req,res){
    const { centreId } = req.params;
    const { testId, price } = req.body;

    //we first need to verify whether this centre exists or not
    if(!centreId||!testId){
        return res.status(400).json({
            message:"Centre_id and Test_id as required",
        })
    }
    const isCentreExist = await pool.query(
        `SELECT id FROM diagnostic_centres
        WHERE id=$1`,
        [centreId]
    )
    if(isCentreExist.rows.length==0){
        return res.status(404).json({
            message:"Centre does not exist",
        })
    }

    //check whether this test exists or not

    const isTestExist = await pool.query(
        `SELECT id FROM diagnostic_tests
        WHERE id = $1`,
        [testId],
    )

    if(isTestExist.rows.length==0){
        return res.status(404).json({
            message:"No such test exists,please associate the test first"
        })
    }
    //Verifying price
    if (price === undefined || typeof price !== "number" || price < 0) {
    return res.status(400).json({
        message: "Price must be a non-negative number"
    });
}

//Verifying whether test+centre association already exists or not

const existingAssociation = await pool.query(
    `SELECT centre_id, test_id
     FROM centre_tests
     WHERE centre_id = $1 AND test_id = $2`,
    [centreId, testId]
);
if (existingAssociation.rows.length > 0) {
    return res.status(409).json({
        message: "Test is already associated with this centre"
    });
}
    const result = await pool.query(
    `INSERT INTO centre_tests (centre_id, test_id, price)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [centreId, testId, price]
);
return res.status(201).json({
        message: "Test assigned to centre",
        centreTest: result.rows[0]
    });
}
module.exports = {
    createCentreController,
    getAllCentresController,
    getCentreByIdController,
    getCentreTestsController,
    assignTestToCentreController
}