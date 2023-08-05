const express = require("express");
var mod = require("nested-property");
const path = require("path");
const Pool = require("pg").Pool;
const uniqId = require("uniqid");
const Razorpay = require("razorpay");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const multer = require("multer");
const zoneData = require("./resources/defaultZones");
const mime = require('mime');
const { json } = require("body-parser");

// mutler for storing the uploaded images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./resources/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

dotenv.config();

// node mailing
let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "softwaredeevia@gmail.com",
    pass: "rcwbvappmvbcccjr",
  },
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./resources"));

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  password: "admin",
  port: 5432,
});

console.log(
  "Please, wait for Database confirmation message. Start, once you receive"
);

const defectOptions = {
  Surface: ["Dent", "Bump", "Burrs", "Spatters", "Others"],
  "Body Fitting": ["Body Fitting 1", "Body Fitting 2", "Body Fitting Others"],
  "Missing & Wrong Part": ["Missing Part", "Wrong Part"],
  Welding: [
    "Welding Part 1",
    "Welding Part 2",
    "Welding Part 3",
    "Welding Part 4",
    "Welding Part Others",
  ],
  "Water Leak": ["Water Leak 1", "Water Leak 2", "Water Leak Others"],
};

async function defaultDataHandler() {
  let dbConnectedPool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "data_entry_systems",
    password: "admin",
    port: 5432,
  });

  let sampleData = {};

  zoneData.map((zone) => {
    mod.set(sampleData, `${zone.category}.${zone.sub_category}._${zone.zone}`, {
      zone: zone["zone"],
      top_position: zone["top_position"],
      bottom_position: zone["bottom_position"],
      right_position: zone["right_position"],
      left_position: zone["left_position"],
      width: zone["width"],
      top_padding: zone["top_padding"],
      bottom_padding: zone["bottom_padding"],
      right_padding: zone["right_padding"],
      left_padding: zone["left_padding"],
    });
  });

  Object.keys(sampleData).map(async (category) => {
    //  Category Options
    await dbConnectedPool.query(
      `INSERT INTO category_options_table(category) VALUES ('${category}')`
    );

    //  Category
    await dbConnectedPool.query(
      `INSERT INTO category_table(category) VALUES ('${category}')`
    );

    // subCategory
    Object.keys(sampleData[category]).map(async (sub_category) => {
      await dbConnectedPool.query(
        `INSERT INTO sub_category_table(sub_category,category) VALUES ('${sub_category}','${category}')`
      );

      //  Defect
      Object.keys(defectOptions).map(async (defect) => {
        await dbConnectedPool.query(
          `INSERT INTO defect_table(defect,sub_category,category)VALUES('${defect}','${sub_category}','${category}')`
        );

        // Sub-Defect
        defectOptions[defect].map(async (sub_defect) => {
          await dbConnectedPool.query(
            `INSERT INTO sub_defect_table(sub_defect,defect,sub_category,category)VALUES('${sub_defect}','${defect}','${sub_category}','${category}')`
          );
        });
      });

      Object.keys(sampleData[category][sub_category]).map(async (zone) => {
        // console.log("zone: ", zone.zone);
        // console.log("zone number: ", zone.zone);
        const zoneObject = sampleData[category][sub_category][zone];
        await dbConnectedPool.query(
          `INSERT INTO zones_table VALUES(${zoneObject.zone},'${category}','${sub_category}',${zoneObject.top_position},${zoneObject.bottom_position},${zoneObject.right_position},${zoneObject.left_position},${zoneObject.width},${zoneObject.top_padding},${zoneObject.bottom_padding},${zoneObject.right_padding},${zoneObject.left_padding});`
        );
      });
    });
  });

  let sub_category_options_list = [];

  // Sub_category_options
  Object.keys(sampleData).map((category) => {
    Object.keys(sampleData[category]).map((sub_category) => {
      sub_category_options_list.push(sub_category);
    });
  });

  sub_category_options_list = [...new Set(sub_category_options_list)];

  sub_category_options_list.map(async (sub_category) => {
    await dbConnectedPool.query(
      `INSERT INTO sub_category_options_table(sub_category) VALUES ('${sub_category}')`
    );
  });

  // Defect Options
  Object.keys(defectOptions).map(async (defect) => {
    await dbConnectedPool.query(
      `INSERT INTO defect_options_table(defect)VALUES('${defect}')`
    );

    // Sub-Defect Options
    defectOptions[defect].map(async (sub_defect) => {
      await dbConnectedPool.query(
        `INSERT INTO sub_defect_options_table(sub_defect)VALUES('${sub_defect}')`
      );
    });
  });
}

async function tabelCreator() {
  console.log("table creator function");
  let dbConnectedPool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "data_entry_systems",
    password: "admin",
    port: 5432,
  });

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS category_table(category varchar(50))`
  );

  console.log("Category table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS sub_category_table(sub_category varchar(50), category varchar(50))`
  );

  console.log("Sub-Category table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS defect_table(defect varchar(50),sub_category varchar(50), category varchar(50))`
  );

  console.log("Defect table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS sub_defect_table(sub_defect varchar(50),defect varchar(50),sub_category varchar(50), category varchar(50))`
  );

  console.log("Sub-Defect table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS zones_table(zone int,category varchar(50),sub_category varchar(50),top_position int,bottom_position int,right_position int,left_position int,width int,top_padding int,bottom_padding int,right_padding int,left_padding int);`
  );

  console.log("Zones table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS category_options_table(category varchar(50))`
  );

  console.log("Category Options table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS sub_category_options_table(sub_category varchar(50))`
  );

  console.log("Sub-Category table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS defect_options_table(defect varchar(50))`
  );

  console.log("Defect Options table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS sub_defect_options_table(sub_defect varchar(50))`
  );

  console.log("Sub-Defect Options table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS employee_table(id SERIAL,name varchar(30), email varchar(50),password varchar(30), company varchar(50) ,status varchar(8), accessible_charts varchar[],created_by varchar);`
  );

  console.log("Employee table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS defect_entry_table(body_number int , mode varchar(8) , category varchar(30), subcategory varchar(30), defect varchar(20), subdefect varchar(20), zone int, defectCount int, date varchar(10), time varchar(8), empID int,username varchar(30));`
  );

  console.log("Defect Entry table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS body_number_table(body_number int , status varchar(10) , date varchar(10), time varchar(8), empID int,username varchar(30));`
  );

  console.log("Body number table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS admin_activity_table(doneByID int , doneByName varchar(30), activity varchar(30), doneToID int, doneToName varchar(30), date varchar(10), time varchar(8));`
  );

  console.log("Admin activity log table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS company_table(id SERIAL, name varchar(50), root_user varchar(30), root_user_password varchar(10), body_number int, used int, remaining int, date varchar(10), time varchar(8));`
  );

  console.log("company table created");

  await dbConnectedPool.query(
    `CREATE TABLE IF NOT EXISTS approval_pending_table (id int, name varchar(50), email varchar(50), password varchar(30), company varchar(50), status varchar(8), accessible_charts varchar[], creator_id int,created_by varchar);`
  );

  console.log("appoval pending table created");

  defaultDataHandler();
}

async function database_creation() {
  // creating database and tables if not exists
  pool.query(
    `SELECT FROM pg_database WHERE datname = 'data_entry_systems'`,
    (err, results) => {
      if (err) {
        throw err;
      } else {
        if (results.rowCount == 0) {
          pool.query(`CREATE DATABASE data_entry_systems`, tabelCreator);
        } else {
          console.log("Database connection established");
        }
      }
    }
  );
}

database_creation();

// let username = ' ';
// let emp_ID = ' ';

// let enteredBodyNumber = 0;
// let selectedSubCategory = '';
// let defectBodyNumberStatus = '';

app.get("/", (req, res) => {
  try {
    console.log("home ");
    res.render(path.join(__dirname, "/views/home.ejs"));
  } catch (err) {
    console.log(err);
  }
});

app.get("/checkout", (req, res) => {
  try {
    res.render(path.join(__dirname, "/views/checkout.ejs"));
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    if (username == "Administrator" && password == "admin@123") {
      const token = jwt.sign({ id: "Administrator" }, process.env.TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send(
        JSON.stringify({
          userStatus: "Administrator",
          validation: "success",
          token: token,
        })
      );
    } else {
      const employeeResponse = await dbConnectedPool.query(
        `SELECT * FROM employee_table WHERE name='${username}' AND password='${password}'`
      );
      if (employeeResponse.rows.length > 0) {
        const token = jwt.sign(
          { id: employeeResponse.rows[0].id },
          process.env.TOKEN_SECRET,
          {
            expiresIn: "1d",
          }
        );
        res.send(
          JSON.stringify({
            userStatus: "Employee",
            validation: "success",
            username: req.body.username,
            emp_ID: employeeResponse.rows[0].id,
            companyName: employeeResponse.rows[0].company,
            token: token,
          })
        );
      } else {
        res.send(
          JSON.stringify({
            userStatus: "Employee",
            validation: "failure",
          })
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
});

function authenticateToken(req, res, next) {
  const token = req.body.token;

  console.log("token: ", req.body);

  if (token == "" || token == null) {
    console.log("un authenticated");
    res.redirect("/");
  } else {
    console.log("authenticated");
    next();
  }
}

app.get("/forgotPassword", (req, res) => {
  try {
    res.render(path.join(__dirname, "/views/forgetPassword.ejs"));
  } catch (err) {
    console.log(err);
  }
});

app.post("/emailVerification", async (req, res) => {
  try {
    const enteredEmail = req.body.email;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE email='${enteredEmail}'`
    );

    if (response.rows.length > 0) {
      // send otp to mail

      var digits = "0123456789";
      let OTP = "";

      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }

      let mailDetails = {
        from: "softwaredeevia@gmail.com",
        to: `${enteredEmail}`,
        subject: "Reset Password from Data Entry Application",
        text: `Hi, OTP to reset your password: ${OTP}`,
      };

      mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
          console.log("Error Occurs");
          console.log(err);
          res.send(
            JSON.stringify({
              status: "failure",
              message: "error sending OTP",
            })
          );
        } else {
          console.log("Reset Password: OTP sent successfully");
          res.send(
            JSON.stringify({
              status: "success",
              otp: OTP,
            })
          );
        }
      });
    } else {
      res.send(
        JSON.stringify({
          status: "failure",
        })
      );
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/resetPassword", async (req, res) => {
  try {
    console.log("resetPassword");
    const email = req.body.email;
    const newPassword = req.body.password;

    console.log("email: ", email);
    console.log("newPassword: ", newPassword);

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response = await dbConnectedPool.query(
      `UPDATE employee_table SET password='${newPassword}' WHERE email='${email}'`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/adminPortal", authenticateToken, async (req, res) => {
  try {
    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const companyResponse = await dbConnectedPool.query(
      `SELECT * FROM company_table`
    );

    let companyDetail = [];
    companyResponse.rows.map((company) => {
      companyDetail.push({
        id: company.id,
        name: company.name,
        root_user: company.root_user,
        body_number: company.body_number,
        used: company.used,
        remaining: company.remaining,
        date: company.date,
        time: company.time,
      });
    });

    let time = "";
    res.render(path.join(__dirname, "/views/adminPortal.ejs"), {
      companyDetail,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/createCompany", async (req, res) => {
  try {
    // name(50), root user(30), root_user_password(10),
    const companyName = req.body.companyName;
    const rootUserName = req.body.rootUserName;
    const rootUserEmail = req.body.rootUserEmail;
    const rootUserPassword = req.body.rootUserPassword;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    // insert into company_table
    await dbConnectedPool.query(
      `INSERT INTO company_table (name,root_user,root_user_password,body_number,used,remaining,date,time) VALUES ('${companyName}','${rootUserName}','${rootUserPassword}',100,0,100,'${date}','${time}')`
    );

    // insert into employee_table
    await dbConnectedPool.query(
      `INSERT INTO employee_table (name,email,password,company,status,accessible_charts,created_by) VALUES ('${rootUserName}','${rootUserEmail}','${rootUserPassword}','${companyName}','admin',Array['DPV (Defects Per Vehicle) Report','Master Report','Main Pareto Report','Pareto Report','Color Map','Surface Summary','Body Fitting Summary','Missing & Wrong Part Summary','Welding Summary','Water Leak Summary'],'Root User')`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addUser", authenticateToken, async (req, res) => {
  try {
    const firstUser = req.body.firstUser;

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const currentCompany = req.body.empCompany;
    const companyName = req.body.companyName;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let defectList = [];
    const defect = await dbConnectedPool.query(
      `SELECT DISTINCT defect FROM defect_table`
    );

    defect.rows.sort((a, b) => {
      return a.defect.localeCompare(b.defect);
    });

    defect.rows.forEach((singleDefect) => {
      defectList.push(singleDefect.defect);
    });

    res.render(path.join(__dirname, "/views/createNewUser.ejs"), {
      currentUser,
      currentEmpID,
      currentCompany,
      companyName,
      firstUser,
      defectList,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/removeUser", async (req, res) => {
  try {
    const userID = req.body.userID;
    const userName = req.body.userName;
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    const response = await dbConnectedPool.query(
      `DELETE FROM employee_table WHERE id = ${userID}`
    );

    await dbConnectedPool.query(
      `INSERT INTO admin_activity_table (doneByID,doneByName,activity,doneToID,doneToName,date,time) VALUES (${currentEmpID},'${currentUser}','removed',${userID},'${userName}','${date}','${time}')`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/newUser", async (req, res) => {
  try {
    const empName = req.body.empName;
    const empEmail = req.body.empEmail;
    const empPassword = req.body.empPassword;
    const empStatus = req.body.empStatus;
    const empCompany = req.body.currentCompany;
    const accessibleCharts = req.body.accessibleCharts;
    const creator = req.body.creator;
    const creatorID = req.body.creatorID;
    const empID = req.body.dummyEmpID;

    console.log("New User Created: ", empName);
    console.log("status: ", empStatus);

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    const dummyEmpIDResponse = await dbConnectedPool.query(
      `SELECT * FROM approval_pending_table WHERE id=${empID}`
    );

    const emailChecker = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE email='${empEmail}' AND company='${empCompany}'`
    );

    if (dummyEmpIDResponse.rows.length == 0) {
      if (emailChecker.rows.length == 0) {
        let mailDetails = {
          from: "softwaredeevia@gmail.com",
          to: empEmail,
          subject: "Invitation to create new user",
          text: `Check this link and fill the form \n http://54.248.63.212:2000/verifyUser \n Credentials \n ID: ${empID} \n Password: ${empPassword}`,
        };

        mailTransporter.sendMail(mailDetails, async function (err, data) {
          if (err) {
            console.log("Error occured while sending email");
            console.log(err);
            res.send(
              JSON.stringify({
                status: "failure",
                reason: "error in sending mail",
              })
            );
          } else {
            console.log("Email sent successfully");
            // name,email,password,company,status,accessible_charts,created_by
            // id int, name varchar(50), email varchar(50), password varchar(30), company varchar(50), status varchar(8), accessible_charts varchar[], created_by varchar

            // invitation sent and stored in database

            await dbConnectedPool.query(
              `INSERT INTO approval_pending_table(id,name,email,password,company,status,accessible_charts,creator_id,created_by) VALUES (${empID},'${empName}','${empEmail}','${empPassword}','${empCompany}','${empStatus}',ARRAY['${accessibleCharts.join(
                `','`
              )}'],${creatorID},'${creator}')`
            );
            res.send(
              JSON.stringify({
                status: "success",
              })
            );
          }
        });
      } else {
        res.send(
          JSON.stringify({
            status: "failure",
            reason: "existing email address",
          })
        );
      }
    } else {
      res.send(
        JSON.stringify({
          status: "failure",
          reason: "dummy ID already existing",
        })
      );
    }
  } catch (err) {
    console.log(err);
    res.send(
      JSON.stringify({
        status: "failure",
        reason: "backend error",
      })
    );
  }
});

app.get("/verifyUser", (req, res) => {
  try {
    res.render(path.join(__dirname, "/views/verifyUser.ejs"));
  } catch (err) {
    console.log(err);
  }
});

app.post("/approveUser", async (req, res) => {
  try {
    const userID = req.body.userID;
    const password = req.body.password;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();

    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    const CheckUserResponse = await dbConnectedPool.query(
      `SELECT * FROM approval_pending_table WHERE id=${userID}`
    );

    if (
      CheckUserResponse.rows.length != 0 &&
      password == CheckUserResponse.rows[0].password
    ) {
      const userReponse = await dbConnectedPool.query(
        `INSERT INTO employee_table (name,email,password,company,status,accessible_charts,created_by) VALUES ('${CheckUserResponse.rows[0].name
        }','${CheckUserResponse.rows[0].email}','${CheckUserResponse.rows[0].password
        }','${CheckUserResponse.rows[0].company}','${CheckUserResponse.rows[0].status
        }',ARRAY['${CheckUserResponse.rows[0].accessible_charts.join(`','`)}'],'${CheckUserResponse.rows[0].created_by
        }') RETURNING id`
      );

      await dbConnectedPool.query(
        `INSERT INTO admin_activity_table (doneByID,doneByName,activity,doneToID,doneToName,date,time) VALUES (${CheckUserResponse.rows[0].creator_id},'${CheckUserResponse.rows[0].created_by}','created',${userReponse.rows[0].id},'${CheckUserResponse.rows[0].name}','${date}','${time}')`
      );

      await dbConnectedPool.query(
        `DELETE FROM approval_pending_table WHERE id=${userID}`
      );
      res.send(
        JSON.stringify({
          status: "success",
          reason: "activated",
        })
      );
    } else {
      res.send(
        JSON.stringify({
          status: "failure",
          reason: "invalid credentials",
        })
      );
    }

    // check the password with approvalPending table for userid and password
    // if same-- save it in database
    // else send response as invalid credentials
  } catch (err) {
    console.log(err);
    res.send(
      JSON.stringify({
        status: "failure",
        reason: "backend error",
      })
    );
  }
});

app.post("/follower", authenticateToken, async (req, res) => {
  try {
    console.log("follower");

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    console.log("currentUser: ", currentUser);
    console.log("currentEmpID: ", currentEmpID);
    console.log("companyName: ", companyName);

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID};`
    );

    if (response.rows.length == 0) {
      res.redirect("/");
    }

    const emp_Status = response.rows[0].status;
    const emp_ChartAccess = response.rows[0].accessible_charts;

    res.render(path.join(__dirname, "/views/follower.ejs"), {
      currentUser,
      currentEmpID,
      emp_Status,
      emp_ChartAccess,
      companyName,
    });
  } catch (err) { }
});

app.post("/bodyNumberBalanceChecker", async (req, res) => {
  try {
    const currentBodyNumber = req.body.currentBodyNumber;
    const companyName = req.body.companyName;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const bodyNumberResponse = await dbConnectedPool.query(
      `SELECT * FROM defect_entry_table WHERE body_number=${currentBodyNumber}`
    );

    const companyResponse = await dbConnectedPool.query(
      `SELECT * FROM company_table WHERE name='${companyName}'`
    );

    if (companyResponse.rows[0].remaining == 0) {
      if (bodyNumberResponse.rows.length == 0) {
        res.send(
          JSON.stringify({
            status: "failure",
            balance: "zero",
          })
        );
      } else {
        res.send(
          JSON.stringify({
            status: "success",
            balance: "oldBodyNumber",
          })
        );
      }
    } else {
      res.send(
        JSON.stringify({
          status: "success",
          balance: "non_zero",
        })
      );
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/bodyNumber", (req, res) => {
  try {
    const currentBodyNumber = req.body.currentBodyNumber;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    // console.log(
    //   `SELECT * FROM body_number_table WHERE body_number=${currentBodyNumber};`
    // );

    let currentDate = new Date();

    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    dbConnectedPool.query(
      `SELECT * FROM body_number_table WHERE body_number=${currentBodyNumber} and date ='${date}';`,
      (error, result) => {
        if (error) {
          console.log(error);
        } else {
          if (result.rows.length == 0) {
            let response = {
              status: "success",
              data: [],
            };

            // console.log(JSON.stringify(response));

            res.send(JSON.stringify(response));
          } else {
            let response = {
              status: "success",
              data: result.rows,
            };

            // console.log(JSON.stringify(response));

            res.end(JSON.stringify(response));
          }
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
});

app.post("/passcar", (req, res) => {
  try {
    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    console.log("currentUser: ", currentUser);

    if (req.body.bodyNumberStatus == "newBodyNumber") {
      console.log(
        `INSERT INTO body_number_table (body_number,status,date,time,empID,username) VALUES (${req.body.bodyNumber},'No Defect','${date}','${time}',${currentEmpID},'${currentUser}')`
      );
      dbConnectedPool.query(
        `INSERT INTO body_number_table (body_number,status,date,time,empID,username) VALUES (${req.body.bodyNumber},'No Defect','${date}','${time}',${currentEmpID},'${currentUser}')`,
        (error, result) => {
          if (error) {
            throw error;
          } else {
            // console.log('New Body Number', result);
          }
        }
      );
    }

    let response = {
      status: "success",
    };

    res.end(JSON.stringify(response));
  } catch (err) {
    console.log(err);
  }
});

app.post("/firstlayer", authenticateToken, async (req, res) => {
  try {
    console.log("first layer");
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const currentBodyNumber = req.body.currentBodyNumber;
    const defectBodyNumberStatus = req.body.bodyNumberStatus;
    const mode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const categoryList = await dbConnectedPool.query(
      "SELECT * FROM category_table;"
    );

    categoryList.rows.sort(function (a, b) {
      return a.category.localeCompare(b.category);
    });

    res.render(path.join(__dirname, "/views/firstLayer.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      currentBodyNumber,
      categoryList: categoryList.rows,
      defectBodyNumberStatus,
      mode,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/secondlayer", authenticateToken, async (req, res) => {
  try {
    console.log("second layer");

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const currentBodyNumber = req.body.currentBodyNumber;
    const defectBodyNumberStatus = req.body.defectBodyNumberStatus;
    const selectedCategory = req.body.selectedCategory;
    const mode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const subCategoryList = await dbConnectedPool.query(
      `SELECT * FROM sub_category_table WHERE category='${selectedCategory}';`
    );

    subCategoryList.rows.sort(function (a, b) {
      return a.sub_category.localeCompare(b.sub_category);
    });

    // console.log('currentUser: ', currentUser);
    // console.log('currentEmpID: ', currentEmpID);
    // console.log('currentBodyNumber: ', currentBodyNumber);
    // console.log('defectBodyNumberStatus: ', defectBodyNumberStatus);
    // console.log('selectedCategory: ', selectedCategory);
    // console.log('mode: ', mode);

    res.render(path.join(__dirname, "/views/secondLayer.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      currentBodyNumber,
      defectBodyNumberStatus,
      selectedCategory,
      subCategoryList: subCategoryList.rows,
      mode,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/thirdlayer", authenticateToken, async (req, res) => {
  try {
    console.log("third layer");

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const currentBodyNumber = req.body.currentBodyNumber;
    const defectBodyNumberStatus = req.body.defectBodyNumberStatus;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const mode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const zones_table = await dbConnectedPool.query(
      `SELECT * FROM zones_table WHERE sub_category='${selectedSubCategory}' and category='${selectedCategory}'`
    );

    zones_table.rows.sort(function (a, b) {
      return a.zone - b.zone;
    });

    const defectList = await dbConnectedPool.query(
      `SELECT * FROM defect_table WHERE category='${selectedCategory}' AND  sub_category='${selectedSubCategory}'`
    );

    defectList.rows.sort(function (a, b) {
      return a.defect.localeCompare(b.defect);
    });

    const subDefectList = await dbConnectedPool.query(
      `SELECT * FROM sub_defect_table WHERE category='${selectedCategory}' AND  sub_category='${selectedSubCategory}'`
    );

    subDefectList.rows.sort(function (a, b) {
      return a.sub_defect.localeCompare(b.sub_defect);
    });

    let defectObject = {};
    if (defectList.rows.length > 0) {
      defectList.rows.map((defect) => {
        if (!defectObject[defect.defect]) {
          defectObject[defect.defect] = {};
        }
      });

      subDefectList.rows.map((subDefect) => {
        defectObject[subDefect.defect][subDefect.sub_defect] = {};
      });
    }

    let categoryId = selectedCategory.replace(/ /g, "_");
    let subcategoryId = selectedSubCategory.replace(/ /g, "_");

    res.render(path.join(__dirname, "/views/thirdLayer.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      currentBodyNumber,
      defectBodyNumberStatus,
      selectedCategory,
      selectedSubCategory,
      defectObject,
      zoneList: zones_table.rows,
      categoryId,
      subcategoryId,
      mode,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/zonechecker", async (req, res) => {
  try {
    console.log("zone checker");

    const defectObj = req.body.defectObj;
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const currentBodyNumber = req.body.currentBodyNumber;
    const defectBodyNumberStatus = req.body.defectBodyNumberStatus;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const mode = req.body.mode;

    // console.log('currentUser: ', currentUser);
    // console.log('currentEmpID: ', currentEmpID);
    // console.log('currentBodyNumber: ', currentBodyNumber);
    // console.log('defectBodyNumberStatus: ', defectBodyNumberStatus);
    // console.log('selectedCategory: ', selectedCategory);
    // console.log('selectedSubCategory: ', selectedSubCategory);
    // console.log('mode: ', mode);

    let filledDefects = {};
    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    Object.keys(defectObj).map((defect) => {
      let defectArray = defect.split("__");
      defectArray[2] = `_${defectArray[2]}`;
      mod.set(filledDefects, defectArray.join("."), defectObj[defect]);
    });

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let messageObject = {};

    async function storeManager() {
      // storing the defects or modifying
      await Promise.all(
        Object.keys(filledDefects).map(async (defectName) => {
          await Promise.all(
            Object.keys(filledDefects[defectName]).map(async (subDefectName) => {
              await Promise.all(
                Object.keys(filledDefects[defectName][subDefectName]).map(
                  async (zone) => {
                    console.log(
                      `SELECT * FROM defect_entry_table WHERE body_number=${currentBodyNumber} AND mode='${mode}' AND category='${selectedCategory}' AND subcategory='${selectedSubCategory}' AND defect='${defectName.replace(
                        /_/g,
                        " "
                      )}' AND subdefect='${subDefectName.replace(
                        /_/g,
                        " "
                      )}' AND zone = ${zone.replace("_", "")}`
                    );
                    const result = await dbConnectedPool.query(
                      `SELECT * FROM defect_entry_table WHERE body_number=${currentBodyNumber} AND mode='${mode}' AND category='${selectedCategory}' AND subcategory='${selectedSubCategory}' AND defect='${defectName.replace(
                        /_/g,
                        " "
                      )}' AND subdefect='${subDefectName.replace(
                        /_/g,
                        " "
                      )}' AND zone = ${zone.replace("_", "")}`
                    );
                    if (result.rows.length == 0) {
                      mod.set(
                        messageObject,
                        `New Zone.${zone}.${defectName.replace(
                          /_/g,
                          " "
                        )}.${subDefectName.replace(/_/g, " ")}`,
                        filledDefects[defectName][subDefectName][zone]
                      );
                    } else {
                      // block to modify existing defect records
                      mod.set(
                        messageObject,
                        `Existing Zone.${zone}.${defectName.replace(
                          /_/g,
                          " "
                        )}.${subDefectName.replace(/_/g, " ")}`,
                        filledDefects[defectName][subDefectName][zone]
                      );
                    }
                  }
                )
              );
            })
          );
        })
      );
    }

    storeManager().then(() => {
      res.send(
        JSON.stringify({
          status: "success",
          data: messageObject,
        })
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/receive-thirdLayer-temp", async (req, res) => {
  try {
    console.log("receive third layer");
    const defectObj = req.body.defectObj;
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const currentBodyNumber = req.body.currentBodyNumber;
    let defectBodyNumberStatus = req.body.defectBodyNumberStatus;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const mode = req.body.mode;

    // console.log('currentUser: ', currentUser);
    // console.log('currentEmpID: ', currentEmpID);
    // console.log('currentBodyNumber: ', currentBodyNumber);
    // console.log('defectBodyNumberStatus: ', defectBodyNumberStatus);
    // console.log('selectedCategory: ', selectedCategory);
    // console.log('selectedSubCategory: ', selectedSubCategory);
    // console.log('mode: ', mode);

    let filledDefects = {};
    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    Object.keys(defectObj).map((defect) => {
      let defectArray = defect.split("__");
      defectArray[2] = `_${defectArray[2]}`;
      mod.set(filledDefects, defectArray.join("."), defectObj[defect]);
    });

    console.log("filledDefects:", filledDefects);

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const bodyNumberResponse = await dbConnectedPool.query(
      `SELECT * FROM defect_entry_table WHERE body_number=${currentBodyNumber}`
    );

    if (bodyNumberResponse.rows.length == 0) {
      const companyResponse = await dbConnectedPool.query(
        `SELECT * FROM company_table WHERE name='${companyName}'`
      );

      await dbConnectedPool.query(
        `UPDATE company_table SET used=${companyResponse.rows[0].used + 1
        } , remaining = ${companyResponse.rows[0].remaining - 1
        } WHERE name = '${companyName}'`
      );
    }

    let messageObject = {};

    async function storeManager() {
      // storing the defects or modifying
      await Promise.all(
        Object.keys(filledDefects).map(async (defectName) => {
          await Promise.all(
            Object.keys(filledDefects[defectName]).map(async (subDefectName) => {
              await Promise.all(
                Object.keys(filledDefects[defectName][subDefectName]).map(
                  async (zone) => {
                    const result = await dbConnectedPool.query(
                      `SELECT * FROM defect_entry_table WHERE body_number=${currentBodyNumber} AND mode='${mode}' AND category='${selectedCategory}' AND subcategory='${selectedSubCategory}' AND defect='${defectName.replace(
                        /_/g,
                        " "
                      )}' AND subdefect='${subDefectName.replace(
                        /_/g,
                        " "
                      )}' AND zone = ${zone.replace("_", "")}`
                    );
                    if (result.rows.length == 0) {
                      mod.set(
                        messageObject,
                        `Newly Saved Zone.${zone}.${defectName.replace(
                          /_/g,
                          " "
                        )}.${subDefectName.replace(/_/g, " ")}`,
                        filledDefects[defectName][subDefectName][zone]
                      );
                      // block to save defects record for the first time
                      console.log(
                        `INSERT INTO defect_entry_table (body_number,mode,category,subcategory,defect,subdefect,zone,defectCount,date,time,empID,username) VALUES (${currentBodyNumber},'${mode}','${selectedCategory}','${selectedSubCategory}','${defectName}','${subDefectName}',${zone.replace(
                          "_",
                          ""
                        )},${filledDefects[defectName][subDefectName][zone]
                        },'${date}','${time}',${currentEmpID},'${currentUser}');`
                      );
                      await dbConnectedPool.query(
                        `INSERT INTO defect_entry_table (body_number,mode,category,subcategory,defect,subdefect,zone,defectCount,date,time,empID,username) VALUES (${currentBodyNumber},'${mode}','${selectedCategory}','${selectedSubCategory}','${defectName.replace(
                          /_/g,
                          " "
                        )}','${subDefectName.replace(/_/g, " ")}',${zone.replace(
                          "_",
                          ""
                        )},${filledDefects[defectName][subDefectName][zone]
                        },'${date}','${time}',${currentEmpID},'${currentUser}');`
                      );
                    } else {
                      // block to modify existing defect records
                      mod.set(
                        messageObject,
                        `Overwritten Zone.${zone}.${defectName.replace(
                          /_/g,
                          " "
                        )}.${subDefectName.replace(/_/g, " ")}`,
                        filledDefects[defectName][subDefectName][zone]
                      );

                      console.log(
                        `UPDATE defect_entry_table SET defectCount=${filledDefects[defectName][subDefectName][zone]
                        },date='${date}',time='${time}',username='${currentUser}' WHERE body_number=${currentBodyNumber} AND mode='${mode}' AND category='${selectedCategory}' AND subcategory='${selectedSubCategory}' AND defect='${defectName}' AND subdefect='${subDefectName}' AND zone=${zone.replace(
                          "_",
                          ""
                        )}`
                      );

                      await dbConnectedPool.query(
                        `UPDATE defect_entry_table SET defectCount=${filledDefects[defectName][subDefectName][zone]
                        },date='${date}',time='${time}',empID = ${currentEmpID},username='${currentUser}' WHERE body_number=${currentBodyNumber} AND mode='${mode}' AND category='${selectedCategory}' AND subcategory='${selectedSubCategory}' AND defect='${defectName.replace(
                          /_/g,
                          " "
                        )}' AND subdefect='${subDefectName.replace(
                          /_/g,
                          " "
                        )}' AND zone=${zone.replace("_", "")}`
                      );
                    }
                  }
                )
              );
            })
          );
        })
      );

      console.log(defectBodyNumberStatus);

      if (defectBodyNumberStatus == "newBodyNumber") {
        console.log(
          `INSERT INTO body_number_table (body_number,status,date,time,empID,username) VALUES (${currentBodyNumber},'Defect','${date}','${time}',${currentEmpID},'${currentUser}')`
        );
        dbConnectedPool.query(
          `INSERT INTO body_number_table (body_number,status,date,time,empID,username) VALUES (${currentBodyNumber},'Defect','${date}','${time}',${currentEmpID},'${currentUser}')`,
          (error, result) => {
            if (error) {
              throw error;
            } else {
              // console.log('New Body Number', result);
            }
          }
        );
        defectBodyNumberStatus = "existingBodyNumber";
      } else if (defectBodyNumberStatus == "existingBodyNumber") {
        console.log(
          `UPDATE body_number_table SET time='${time}',empID=${currentEmpID},username='${currentUser}' WHERE body_number = '${currentBodyNumber}' and date='${date}';`
        );
        dbConnectedPool.query(
          `UPDATE body_number_table SET time='${time}',empID=${currentEmpID},username='${currentUser}' WHERE body_number = '${currentBodyNumber}' and date='${date}';`,
          (error, result) => {
            if (error) {
              throw error;
            } else {
              // console.log('Body Number Modified', result);
            }
          }
        );
      }
    }

    storeManager().then(() => {
      res.send(
        JSON.stringify({
          status: "success",
          data: messageObject,
        })
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/filter", async (req, res) => {
  try {
    console.log("filter");
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID};`
    );

    if (response.rows.length == 0) {
      res.redirect("/");
    }

    const accessibleReport = response.rows[0].accessible_charts;
    const emp_Status = response.rows[0].status;

    let defectList = [];
    const defect = await dbConnectedPool.query(
      `SELECT DISTINCT defect FROM defect_table`
    );

    defect.rows.sort((a, b) => {
      return a.defect.localeCompare(b.defect);
    });

    defect.rows.forEach((singleDefect) => {
      defectList.push(singleDefect.defect);
    });

    res.render(path.join(__dirname, "/views/adminLaundingPage.ejs"), {
      currentUser,
      currentEmpID,
      accessibleReport,
      emp_Status,
      companyName,
      defectList,
    });
  } catch (err) { }
});

app.post("/reportDataProvider", async (req, res) => {
  try {
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const defectMode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let categoryList = [];
    let defectList = [];
    const defect = await dbConnectedPool.query(
      `SELECT DISTINCT defect FROM defect_table`
    );

    defect.rows.sort((a, b) => {
      return a.defect.localeCompare(b.defect);
    });

    defect.rows.forEach((singleDefect) => {
      defectList.push(singleDefect.defect);
    });

    const category = await dbConnectedPool.query(`SELECT * FROM category_table`);

    category.rows.sort((a, b) => {
      return a.category.localeCompare(b.category);
    });

    category.rows.forEach((singleCategory) => {
      categoryList.push(singleCategory.category);
    });

    let bodyNumberData = [];

    let requiredData = {};
    await Promise.all(
      category.rows.map(async (category) => {
        await Promise.all(
          defect.rows.map(async (defect) => {
            const totalData = await dbConnectedPool.query(
              `SELECT * FROM defect_entry_table WHERE category='${category.category}' AND defect='${defect.defect}'`
            );
            let defectsCount = 0;
            await Promise.all(
              totalData.rows.map(async (record) => {
                if (
                  Date.parse(record.date) <= Date.parse(toDate) &&
                  Date.parse(record.date) >= Date.parse(fromDate) &&
                  defectMode == record.mode
                ) {
                  defectsCount += record.defectcount;
                  bodyNumberData.push(record.body_number);
                }
              })
            );
            mod.set(
              requiredData,
              `${category.category}.${defect.defect}`,
              defectsCount
            );
          })
        );
      })
    );

    // console.log("requiredData: ", requiredData);
    // console.log("defectList: ", defectList);
    // console.log("categoryList: ", categoryList);
    // console.log("bodyNumberData: ", Array.from(new Set(bodyNumberData)));

    res.end(
      JSON.stringify({
        status: "success",
        uniqueBodyNumberData: Array.from(new Set(bodyNumberData)),
        defectList,
        categoryList,
        data: requiredData,
      })
    );
  } catch (err) {
    console.log(err);
  }
});

app.post("/majorDefectDetail", async (req, res) => {
  try {
    const majorDefectsInAllGroup = req.body.majorDefectsInAllGroup;
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const defectMode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let majorDefectsDataInAllGroup = JSON.parse(JSON.stringify(majorDefectsInAllGroup));

    await Promise.all(
      Object.keys(majorDefectsInAllGroup).map(async (category) => {
        const subDefectList = await dbConnectedPool.query(
          `SELECT * FROM sub_defect_table WHERE category='${category}' AND defect='${majorDefectsInAllGroup[category]}'`
        );

        subDefectList.rows.sort(function (a, b) {
          return a.sub_defect.localeCompare(b.sub_defect);
        });

        majorDefectsDataInAllGroup[category] = {};

        subDefectList.rows.map((subDefect) => {
          majorDefectsDataInAllGroup[category][subDefect.sub_defect] = 0;
        });

        await Promise.all(
          Object.keys(majorDefectsDataInAllGroup[category]).map(
            async (sub_defect) => {
              const subDefectRecords = await dbConnectedPool.query(
                `SELECT * FROM defect_entry_table WHERE category='${category}' AND defect='${majorDefectsInAllGroup[category]}' AND subdefect= '${sub_defect}'`
              );

              subDefectRecords.rows.map((singleRecord) => {
                if (
                  Date.parse(singleRecord.date) <= Date.parse(toDate) &&
                  Date.parse(singleRecord.date) >= Date.parse(fromDate) &&
                  defectMode == singleRecord.mode
                ) {
                  majorDefectsDataInAllGroup[category][singleRecord.subdefect] +=
                    singleRecord.defectcount;
                }
              });
            }
          )
        );
      })
    );

    let response = {
      status: "success",
      data: majorDefectsDataInAllGroup,
    };

    res.send(JSON.stringify(response));
  } catch (err) {
    console.log(err);
  }
});

app.post("/majorSubDefectDetail", async (req, res) => {
  try {
    const majorSubDefectsInAllGroup = req.body.majorSubDefectsInAllGroup;
    const majorDefectsInAllGroup = req.body.majorDefectsInAllGroup;
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const defectMode = req.body.mode;

    let responseObject = JSON.parse(JSON.stringify(majorSubDefectsInAllGroup));

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });



    await Promise.all(
      Object.keys(majorSubDefectsInAllGroup).map(async (category) => {
        const response = await dbConnectedPool.query(
          `SELECT * FROM defect_entry_table WHERE category = '${category}' AND defect = '${majorDefectsInAllGroup[category]}' AND subdefect = '${Object.keys(majorSubDefectsInAllGroup[category])[0]}'`
        );

        responseObject[category] = {};
        response.rows.map((singleRecord) => {
          if (!responseObject[category][singleRecord.subcategory]) {
            responseObject[category][singleRecord.subcategory] = {}
          }
          if (
            Date.parse(singleRecord.date) <= Date.parse(toDate) &&
            Date.parse(singleRecord.date) >= Date.parse(fromDate) &&
            defectMode == singleRecord.mode
          ) {
            if (!responseObject[category][singleRecord.subcategory][singleRecord.zone]) {
              responseObject[category][singleRecord.subcategory][singleRecord.zone] = singleRecord.defectcount
            } else {
              responseObject[category][singleRecord.subcategory][singleRecord.zone] += singleRecord.defectcount
            }
          }
        });
      })
    );

    res.send(
      JSON.stringify({
        status: "success",
        data: responseObject,
      })
    );
  } catch (err) {
    console.log(err);
  }
});

app.post("/pareto", async (req, res) => {
  try {
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const defectMode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let dataFetcher = {};

    const data = await dbConnectedPool.query(`SELECT * from defect_entry_table`);

    let categoryList = [];

    const defectList = await dbConnectedPool.query(
      `SELECT DISTINCT defect FROM defect_table`
    );

    defectList.rows.sort((a, b) => {
      return a.defect.localeCompare(b.defect);
    });

    const subDefectList = await dbConnectedPool.query(
      `SELECT * FROM sub_defect_table`
    );

    subDefectList.rows.sort(function (a, b) {
      return a.sub_defect.localeCompare(b.sub_defect);
    });

    let defectObject = {};
    if (defectList.rows.length > 0) {
      defectList.rows.map((defect) => {
        if (!defectObject[defect.defect]) {
          defectObject[defect.defect] = {};
        }
        // console.log("defect.defect: ", defect.defect, defectObject);
      });

      subDefectList.rows.map((subDefect) => {
        defectObject[subDefect.defect][subDefect.sub_defect] = {};
      });
    }

    const category = await dbConnectedPool.query(`SELECT * FROM category_table`);

    category.rows.sort((a, b) => {
      return a.category.localeCompare(b.category);
    });

    category.rows.forEach((singleCategory) => {
      categoryList.push(singleCategory.category);
    });

    data.rows.map((record) => {
      if (
        Date.parse(record.date) <= Date.parse(toDate) &&
        Date.parse(record.date) >= Date.parse(fromDate) &&
        defectMode == record.mode
      ) {
        mod.set(
          dataFetcher,
          [
            record.category,
            record.subcategory,
            record.defect,
            record.subdefect,
            "_" + String(record.body_number),
            "_" + String(record.zone),
          ].join("."),
          record.defectcount
        );
      }
    });

    console.log("dataFetcher", dataFetcher);

    let response = {
      message: "success",
      data: dataFetcher,
      defectObject,
      categoryList,
    };

    res.send(JSON.stringify(response));
  } catch (err) {
    console.log(err);
  }
});

app.post("/colorMap", async (req, res) => {
  try {
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const defectMode = req.body.mode;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let dataFetcher = {};

    const zoneResponse = await dbConnectedPool.query(`SELECT * FROM zones_table`);
    console.log("zoneResponse: ", zoneResponse);
    const zoneDetails = {};
    zoneResponse.rows.map((zone) => {
      zoneDetails[zone.zone] = {};
      zoneDetails[zone.zone]["top_position"] = zone.top_position;
      zoneDetails[zone.zone]["bottom_position"] = zone.bottom_position;
      zoneDetails[zone.zone]["left_position"] = zone.left_position;
      zoneDetails[zone.zone]["right_position"] = zone.right_position;
      zoneDetails[zone.zone]["width"] = zone.width;
      zoneDetails[zone.zone]["top_padding"] = zone.top_padding;
      zoneDetails[zone.zone]["bottom_padding"] = zone.bottom_padding;
      zoneDetails[zone.zone]["left_padding"] = zone.left_padding;
      zoneDetails[zone.zone]["right_padding"] = zone.right_padding;
    });

    const records = await dbConnectedPool.query(
      `SELECT * FROM defect_entry_table`
    );
    records.rows.map((record, index) => {
      if (
        Date.parse(record.date) <= Date.parse(toDate) &&
        Date.parse(record.date) >= Date.parse(fromDate) &&
        defectMode == record.mode
      ) {
        try {
          if (
            dataFetcher[record.category][record.subcategory][record.defect][
            record.subdefect
            ]["_" + String(record.zone)]
          ) {
            dataFetcher[record.category][record.subcategory][record.defect][
              record.subdefect
            ]["_" + String(record.zone)] += record.defectcount;
          } else {
            mod.set(
              dataFetcher,
              [
                record.category,
                record.subcategory,
                record.defect,
                record.subdefect,
                "_" + record.zone,
              ].join("."),
              record.defectcount
            );
          }
        } catch {
          mod.set(
            dataFetcher,
            [
              record.category,
              record.subcategory,
              record.defect,
              record.subdefect,
              "_" + record.zone,
            ].join("."),
            record.defectcount
          );
        }
      }
    });
    //  console.log("color Map dataFetcher", dataFetcher);
    delete dataFetcher[""];

    let response = {
      message: "success",
      data: dataFetcher,
      zoneDetails: zoneDetails,
    };
    res.send(JSON.stringify(response));
  } catch (err) {
    console.log(err);
  }
});

app.post("/individualSummaryReport", async (req, res) => {
  try {
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const defectMode = req.body.mode;
    const defectName = req.body.defectName;
    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const subDefectListResponse = await dbConnectedPool.query(
      `SELECT DISTINCT sub_defect FROM sub_defect_table WHERE defect='${defectName}'`
    );

    subDefectListResponse.rows.sort(function (a, b) {
      return a.sub_defect.localeCompare(b.sub_defect);
    });

    const subDefectList = [];

    subDefectListResponse.rows.map((subDefect) => {
      subDefectList.push(subDefect.sub_defect);
    });

    let categoryList = [];
    const categoryListResponse = await dbConnectedPool.query(
      "SELECT * FROM category_table;"
    );

    categoryListResponse.rows.sort(function (a, b) {
      return a.category.localeCompare(b.category);
    });

    categoryListResponse.rows.map((category) => {
      categoryList.push(category.category);
    });

    let dataFetcher = {};

    let count = 0

    await Promise.all(
      categoryList.map(async (category) => {
        const subCategoryData = await dbConnectedPool.query(
          `SELECT * FROM sub_category_table WHERE category='${category}'`
        );
        await Promise.all(
          subCategoryData.rows.map(async (subcategory) => {
            const subDefectList = await dbConnectedPool.query(
              `SELECT DISTINCT sub_defect FROM sub_defect_table WHERE category='${category}' AND sub_category='${subcategory.sub_category}' AND defect='${defectName}'`
            );

            subDefectList.rows.map(async (subDefect) => {
              mod.set(
                dataFetcher,
                [category, subcategory.sub_category, subDefect.sub_defect].join("."),
                0
              );
            });
          })
        );
      })
    );

    console.log('dataFetcher: 1', dataFetcher)

    await Promise.all(
      categoryList.map(async (category) => {
        const subCategoryData = await dbConnectedPool.query(
          `SELECT * FROM sub_category_table WHERE category='${category}'`
        );
        await Promise.all(
          subCategoryData.rows.map(async (subcategory) => {
            const subDefectList = await dbConnectedPool.query(
              `SELECT DISTINCT sub_defect FROM sub_defect_table WHERE category='${category}' AND sub_category='${subcategory.sub_category}' AND defect='${defectName}'`
            );

            await Promise.all(
              subDefectList.rows.map(async (subDefect) => {
                // mod.set(
                //   dataFetcher,
                //   [category, subcategory.sub_category, subDefect.sub_defect].join("."),
                //   0
                // );

                const subDefectData = await dbConnectedPool.query(
                  `SELECT * FROM defect_entry_table WHERE category='${category}' AND subcategory='${subcategory.sub_category}' AND defect='${defectName}' AND subdefect='${subDefect.sub_defect}'`
                );

                await Promise.all(
                  subDefectData.rows.map(async (record) => {
                    if (
                      Date.parse(record.date) <= Date.parse(toDate) &&
                      Date.parse(record.date) >= Date.parse(fromDate) &&
                      defectMode == record.mode
                    ) {
                      dataFetcher[category][subcategory.sub_category][
                        subDefect.sub_defect
                      ] += record.defectcount;
                    }
                  })
                )
              })
            )
          })
        );
      })
    );

    console.log('dataFetcher final: ', dataFetcher)

    res.send(
      JSON.stringify({
        status: "success",
        data: dataFetcher,
        subDefectList: subDefectList,
      })
    );
  } catch (err) {
    console.log(err);
  }
});

app.post("/admin", authenticateToken, async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    console.log("companyName: ", companyName);

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let response = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE company='${companyName}'`
    );

    const employeeRecords = response.rows.sort((r1, r2) =>
      r1.id > r2.id ? 1 : r1.id < r2.id ? -1 : 0
    );

    const response2 = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID} AND company='${companyName}'`
    );

    if (response2.rows.length == 0) {
      res.redirect("/");
    }

    const emp_ChartAccess = response2.rows[0].accessible_charts;
    const emp_Status = response2.rows[0].status;
    const emp_Company = response2.rows[0].company;

    let defectList = [];
    const defect = await dbConnectedPool.query(
      `SELECT DISTINCT defect FROM defect_table`
    );

    defect.rows.sort((a, b) => {
      return a.defect.localeCompare(b.defect);
    });

    defect.rows.forEach((singleDefect) => {
      defectList.push(singleDefect.defect);
    });

    res.render(path.join(__dirname, "/views/adminPage.ejs"), {
      currentUser,
      currentEmpID,
      employeeRecords,
      emp_ChartAccess,
      emp_Status,
      companyName,
      defectList,
    });
  } catch (err) { }
});

app.post("/updateEmpStatus", async (req, res) => {
  try {
    const changeEmpID = req.body.changeEmpID;
    const changeEmpName = req.body.changeEmpName;
    const changeEmpStatus = req.body.changeEmpStatus;

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.current_Emp_ID;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    const response = dbConnectedPool.query(
      `UPDATE employee_table SET status='${changeEmpStatus}' WHERE id=${changeEmpID}`
    );

    await dbConnectedPool.query(
      `INSERT INTO admin_activity_table (doneByID,doneByName,activity,doneToID,doneToName,date,time) VALUES (${currentEmpID},'${currentUser}','updated status to ${changeEmpStatus}',${changeEmpID},'${changeEmpName}','${date}','${time}')`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/updateEmpChartAccess", async (req, res) => {
  try {
    const changeEmpID = req.body.changeEmpID;
    const changeEmpName = req.body.changeEmpName;
    const selectedChartAccess = req.body.selectedChartAccess;

    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const time =
      String(currentDate.getHours()) +
      ":" +
      String(currentDate.getMinutes()) +
      ":" +
      String(currentDate.getSeconds());

    const response = dbConnectedPool.query(
      `UPDATE employee_table SET accessible_charts= ARRAY['${selectedChartAccess.join(
        `','`
      )}'] WHERE id=${changeEmpID}`
    );

    await dbConnectedPool.query(
      `INSERT INTO admin_activity_table (doneByID,doneByName,activity,doneToID,doneToName,date,time) VALUES (${currentEmpID},'${currentUser}','updated report access',${changeEmpID},'${changeEmpName}','${date}','${time}')`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/adminLog", authenticateToken, async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response2 = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID};`
    );

    if (response2.rows.length == 0) {
      res.redirect("/");
    }

    const emp_ChartAccess = response2.rows[0].accessible_charts;
    const emp_Status = response2.rows[0].status;

    const adminActivityRecords = await dbConnectedPool.query(
      "SELECT * FROM admin_activity_table;"
    );

    res.render(path.join(__dirname, "/views/adminLog.ejs"), {
      currentUser,
      currentEmpID,
      emp_ChartAccess,
      emp_Status,
      companyName,
      adminActivityRecords: adminActivityRecords.rows.reverse(),
    });
  } catch (err) { }
});

app.post("/dashboard", authenticateToken, async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    console.log("dashboard");
    console.log("companyName: ", companyName);

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response2 = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID};`
    );

    if (response2.rows.length == 0) {
      res.redirect("/");
    }

    const defectList = await dbConnectedPool.query(
      `SELECT DISTINCT defect FROM defect_table`
    );

    defectList.rows.sort(function (a, b) {
      return a.defect.localeCompare(b.defect);
    });

    const emp_ChartAccess = response2.rows[0].accessible_charts;
    const emp_Status = response2.rows[0].status;

    res.render(path.join(__dirname, "/views/liveDashboard.ejs"), {
      currentUser,
      currentEmpID,
      emp_ChartAccess,
      emp_Status,
      companyName,
      defectList: defectList.rows,
    });
  } catch (err) { }
});

app.post("/liveData", async (req, res) => {
  try {
    const defectList = req.body.defectList;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    // things which are needed
    // total no of cars, defects, individual defect count
    const defectResponse = await dbConnectedPool.query(
      `SELECT * FROM defect_entry_table WHERE date='${date}'`
    );

    // console.log('defectResponse: ', defectResponse);

    // online
    let bodyNumberArrayOnline = [];
    let defectCountOnline = 0;
    let individualDefectCountOnline = {};

    // offline
    let bodyNumberArrayOffline = [];
    let defectCountOffline = 0;
    let individualDefectCountOffline = {};

    //  fixing dynamic defect properties inside data carrier
    defectList.map((defect) => {
      individualDefectCountOnline[defect.defect] = 0;
      individualDefectCountOffline[defect.defect] = 0;
    });

    let employeeDefectResponseData = [];

    let recordDataTemp = {
      empid: defectResponse.rows[0].empid,
      username: defectResponse.rows[0].username,
      body_number: defectResponse.rows[0].body_number,
      defectcount: defectResponse.rows[0].defectcount,
      time: defectResponse.rows[0].time,
    };

    defectResponse.rows.map((record, index) => {
      if (record.mode == "online") {
        // for unique bodyNumber
        bodyNumberArrayOnline.push(record.body_number);
        // for total defect count
        defectCountOnline += record.defectcount;
        // for individual defect count
        individualDefectCountOnline[record.defect] += record.defectcount;
      } else {
        // for unique bodyNumber
        bodyNumberArrayOffline.push(record.body_number);
        // for total defect count
        defectCountOffline += record.defectcount;
        // for individual defect count
        individualDefectCountOffline[record.defect] += record.defectcount;
      }

      // for employee defect log table
      if (index != 0) {
        if (
          record.empid == recordDataTemp.empid &&
          record.body_number == recordDataTemp.body_number &&
          record.time == recordDataTemp.time
        ) {
          recordDataTemp.defectcount += record.defectcount;
        } else {
          employeeDefectResponseData.push(
            JSON.parse(JSON.stringify(recordDataTemp))
          );

          recordDataTemp.empid = record.empid;
          recordDataTemp.username = record.username;
          recordDataTemp.body_number = record.body_number;
          recordDataTemp.defectcount = record.defectcount;
          recordDataTemp.time = record.time;
        }
      }

      if (index == defectResponse.rows.length - 1) {
        employeeDefectResponseData.push(recordDataTemp);
      }
    });

    // console.log('data: ', employeeDefectResponseData);

    const uniqueBodyNumberOnline = [...new Set(bodyNumberArrayOnline)];
    const uniqueBodyNumberOffline = [...new Set(bodyNumberArrayOffline)];

    res.send(
      JSON.stringify({
        uniqueBodyNumberOnline,
        defectCountOnline,
        individualDefectCountOnline,
        uniqueBodyNumberOffline,
        defectCountOffline,
        individualDefectCountOffline,
        employeeDefectResponse: employeeDefectResponseData.reverse(),
      })
    );
  } catch (err) {
    res.send(
      JSON.stringify({
        uniqueBodyNumber: [],
        defectCount: 0,
        individualDefectCount: {
          Surface: 0,
          "Body Fitting": 0,
          "Missing & Wrong Part": 0,
          Welding: 0,
          "Water Leak": 0,
        },
        employeeDefectResponse: [],
      })
    );
  }
});

app.post("/liveNotification", async (req, res) => {
  try {
    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    // console.log('----------------- liveNotification ----------------');

    let currentDate = new Date();
    const date =
      String(currentDate.getFullYear()) +
      "-" +
      (currentDate.getMonth() + 1 <= 9
        ? "0" + Number(currentDate.getMonth() + 1)
        : Number(currentDate.getMonth() + 1)) +
      "-" +
      (currentDate.getDate() <= 9
        ? "0" + Number(currentDate.getDate())
        : Number(currentDate.getDate()));

    const codedTiming = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      currentDate.getDate(),
      currentDate.getHours(),
      currentDate.getMinutes(),
      currentDate.getSeconds(),
      0
    );

    const subbedTime = new Date(codedTiming - 5000);

    const defectResponse = await dbConnectedPool.query(
      `SELECT * FROM defect_entry_table WHERE date='${date}'`
    );

    let recordDataTemp = {
      empid: 0,
      username: "",
      body_number: 0,
      defectcount: 0,
      time: "",
    };

    let liveNotificationData = [];

    let flag = false;
    defectResponse.rows.map((record, index) => {
      const recordDate = record.date.split("-");
      const recordTime = record.time.split(":");

      const recordTiming = new Date(
        recordDate[0],
        recordDate[1],
        recordDate[2],
        recordTime[0],
        recordTime[1],
        recordTime[2]
      );

      if (recordTiming >= subbedTime) {
        if (flag) {
          if (
            record.empid == recordDataTemp.empid &&
            record.body_number == recordDataTemp.body_number &&
            record.time == recordDataTemp.time
          ) {
            recordDataTemp.defectcount += record.defectcount;
          } else {
            liveNotificationData.push(JSON.parse(JSON.stringify(recordDataTemp)));

            recordDataTemp.empid = record.empid;
            recordDataTemp.username = record.username;
            recordDataTemp.body_number = record.body_number;
            recordDataTemp.defectcount = record.defectcount;
            recordDataTemp.time = record.time;
          }
        } else {
          recordDataTemp.empid = record.empid;
          recordDataTemp.username = record.username;
          recordDataTemp.body_number = record.body_number;
          recordDataTemp.defectcount = record.defectcount;
          recordDataTemp.time = record.time;
          flag = true;
        }

        if (index == defectResponse.rows.length - 1) {
          liveNotificationData.push(recordDataTemp);
        }
      }
    });

    // console.log('liveNotificationData: ', liveNotificationData);

    res.send(
      JSON.stringify({
        liveNotificationData,
      })
    );
  } catch (err) {
    res.send(
      JSON.stringify({
        liveNotificationData: [],
      })
    );
  }
});

app.post("/selectPack", (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    res.render(path.join(__dirname, "/views/selectPack.ejs"));
  } catch (err) {
    console.log(err);
  }
});

app.post("/profile", authenticateToken, async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    console.log("userProfile");

    console.log("currentUser: ", currentUser);
    console.log("currentEmpID: ", currentEmpID);
    console.log("companyName: ", companyName);

    /// have to pass companyName along with user and id

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const companyResponse = await dbConnectedPool.query(
      `SELECT * FROM company_table WHERE name='${companyName}'`
    );

    const employeeResponse = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID} AND company='${companyName}';`
    );

    if (employeeResponse.rows.length == 0) {
      res.redirect("/");
    }

    const employeeDetail = {
      name: employeeResponse.rows[0].name,
      id: employeeResponse.rows[0].id,
      email: employeeResponse.rows[0].email,
      company: employeeResponse.rows[0].company,
      accessible_charts: employeeResponse.rows[0].accessible_charts,
      status: employeeResponse.rows[0].status,
      created_by: employeeResponse.rows[0].created_by,
    };

    const companyDetail = {
      name: companyResponse.rows[0].name,
      body_number: companyResponse.rows[0].body_number,
      used: companyResponse.rows[0].used,
      remaining: companyResponse.rows[0].remaining,
    };

    res.render(path.join(__dirname, "/views/userProfile.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      companyDetail,
      employeeDetail,
    });
  } catch (err) { }
});

app.post("/updatePassword", async (req, res) => {
  try {
    const currentPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    const empCompany = req.body.empCompany;
    const empID = req.body.empID;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const userResponse = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${empID} AND company='${empCompany}'`
    );

    const userData = userResponse.rows[0];

    if (currentPassword == userData.password) {
      if (currentPassword == newPassword) {
        res.send(
          JSON.stringify({
            status: "failure",
            type: "same password",
          })
        );
      } else {
        await dbConnectedPool.query(
          `UPDATE employee_table SET password='${newPassword}' WHERE id=${empID} AND company='${empCompany}'`
        );

        res.send(
          JSON.stringify({
            status: "success",
            type: "password updated",
          })
        );
      }
    } else {
      res.send(
        JSON.stringify({
          status: "failure",
          type: "Invalid current password",
        })
      );
    }
  } catch (err) {
    console.log(err);
    res.send(
      JSON.stringify({
        status: "failure",
        type: "backend error",
      })
    );
  }
});

app.post("/checkout", async (req, res) => {
  try {
    // let fname = req.body.first_name;
    // let lname = req.body.last_name;
    // let amount = req.body.tree;
    // let tname = req.body.tname;
    // let email = req.body.email;
    let tid = uniqId();

    var instance = new Razorpay({
      key_id: "rzp_test_Ba9dKThqzF925j",
      key_secret: "vnkPGoKUQeOWalRtqOmTjCSk",
    });

    const format = { year: "numeric", month: "long", day: "numeric" };
    const date = new Date();

    let options = await instance.orders.create({
      amount: 500 * 100,
      currency: "INR",
      receipt: uniqId(),
      function(err, ordre) {
        console.log(order);
        res.send({ orderId: options.id });
      },
    });

    console.log(options);

    const requests = new Request({
      name: fullName,
      tid: tid,
      tname: Deevia,
      date: date.toLocaleDateString("en-US", format),
    });
    const generated = await requests.save();
    console.log("Added data");
    console.log("Request Generated");
    res.render("final_checkout");
  } catch (err) {
    console.log(err);
  }
});

app.post("/updateSection", authenticateToken, async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID};`
    );

    if (response.rows.length == 0) {
      res.redirect("/");
    }

    const categoryOptionsList = await dbConnectedPool.query(
      `SELECT * FROM category_options_table;`
    );

    categoryOptionsList.rows.sort(function (a, b) {
      return a.category.localeCompare(b.category);
    });

    const categoryList = await dbConnectedPool.query(
      "SELECT * FROM category_table;"
    );

    categoryList.rows.sort(function (a, b) {
      return a.category.localeCompare(b.category);
    });

    const accessibleReport = response.rows[0].accessible_charts;
    const emp_Status = response.rows[0].status;

    // const bodyNumberOptions = Object.keys(Options);

    res.render(path.join(__dirname, "/views/updateSection.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      emp_ChartAccess: accessibleReport,
      emp_Status,
      //  bodyNumberOptions,
      categoryOptionsListItems: categoryOptionsList.rows,
      categoryListItems: categoryList.rows,
    });
  } catch (err) { }
});

app.post("/addCategory", async (req, res) => {
  try {
    const addingCategory = req.body.newCategory;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO category_table(category) VALUES ('${addingCategory}')`
    );

    res.send(
      JSON.stringify({
        status: "success",
      })
    );
  } catch (err) {
    console.log(err);
    res.send(
      JSON.stringify({
        status: "failure",
        reason: "backend error",
      })
    );
  }
});

app.post("/removeCategory", async (req, res) => {
  try {
    const removingCategory = req.body.category;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `DELETE FROM category_table WHERE category='${removingCategory}'`
    );

    await dbConnectedPool.query(
      `DELETE FROM sub_category_table WHERE category='${removingCategory}'`
    );

    await dbConnectedPool.query(
      `DELETE FROM defect_table WHERE category='${removingCategory}'`
    );

    await dbConnectedPool.query(
      `DELETE FROM sub_defect_table WHERE category='${removingCategory}'`
    );

    // remove from associated defects
    res.sendStatus(200);
  } catch (err) {
    console.log(err);

    res.sendStatus(400);
  }
});

app.post("/updateSection-II", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const selectedCategory = req.body.selectedCategory;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const subCategoryOptionsList = await dbConnectedPool.query(
      `SELECT * FROM sub_category_options_table;`
    );

    subCategoryOptionsList.rows.sort(function (a, b) {
      return a.sub_category.localeCompare(b.sub_category);
    });

    const subCategoryList = await dbConnectedPool.query(
      `SELECT * FROM sub_category_table WHERE category='${selectedCategory}';`
    );

    subCategoryList.rows.sort(function (a, b) {
      return a.sub_category.localeCompare(b.sub_category);
    });

    res.render(path.join(__dirname, "/views/updateSubCategory.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      selectedCategory,
      subCategoryOptionsList: subCategoryOptionsList.rows,
      subCategoryList: subCategoryList.rows,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/addSubCategory", async (req, res) => {
  try {
    const addingSubCategory = req.body.addingSubCategory;
    const addingCategory = req.body.addingCategory;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO sub_category_table(sub_category,category)VALUES('${addingSubCategory}','${addingCategory}')`
    );

    res.send(
      JSON.stringify({
        status: "success",
      })
    );
  } catch (err) {
    console.log(err);
    res.send(
      JSON.stringify({
        status: "failure",
        reason: "backend error",
      })
    );
  }
});

app.post("/removeSubCategory", async (req, res) => {
  try {
    const removeSubCategory = req.body.removeSubCategory;
    const Category = req.body.Category;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `DELETE FROM sub_category_table WHERE sub_category='${removeSubCategory}'`
    );

    await dbConnectedPool.query(
      `DELETE FROM defect_table WHERE sub_category='${removeSubCategory}'`
    );

    await dbConnectedPool.query(
      `DELETE FROM sub_defect_table WHERE sub_category='${removeSubCategory}'`
    );

    // remove from associated defectList table
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/updateSection-III", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;

    let categoryId = selectedCategory.replace(/ /g, "_");
    let subcategoryId = selectedSubCategory.replace(/ /g, "_");

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const zones_table = await dbConnectedPool.query(
      `SELECT * FROM zones_table WHERE sub_category='${selectedSubCategory}' and category='${selectedCategory}'`
    );

    zones_table.rows.sort(function (a, b) {
      return a.zone - b.zone;
    });

    const defectOptions = await dbConnectedPool.query(
      `SELECT * FROM defect_options_table`
    );

    defectOptions.rows.sort(function (a, b) {
      return a.defect.localeCompare(b.defect);
    });

    const subDefectOptions = await dbConnectedPool.query(
      `SELECT * FROM sub_defect_options_table`
    );

    subDefectOptions.rows.sort(function (a, b) {
      return a.sub_defect.localeCompare(b.sub_defect);
    });

    const defectList = await dbConnectedPool.query(
      `SELECT * FROM defect_table WHERE category='${selectedCategory}' AND  sub_category='${selectedSubCategory}'`
    );

    defectList.rows.sort(function (a, b) {
      return a.defect.localeCompare(b.defect);
    });

    const subDefectList = await dbConnectedPool.query(
      `SELECT * FROM sub_defect_table WHERE category='${selectedCategory}' AND  sub_category='${selectedSubCategory}'`
    );

    subDefectList.rows.sort(function (a, b) {
      return a.sub_defect.localeCompare(b.sub_defect);
    });

    // console.log("defectList: ", defectList.rows);
    // console.log("subDefectList: ", subDefectList.rows);

    let defectObject = {};
    if (defectList.rows.length > 0) {
      defectList.rows.map((defect) => {
        if (!defectObject[defect.defect]) {
          defectObject[defect.defect] = {};
        }
        // console.log("defect.defect: ", defect.defect, defectObject);
      });

      subDefectList.rows.map((subDefect) => {
        defectObject[subDefect.defect][subDefect.sub_defect] = {};
      });
    }

    let zoneObject = {};

    if (zones_table.rows.length > 0) {
      zones_table.rows.map((zone) => {
        zoneObject[zone.zone] = {};

        Object.keys(zone).map((style) => {
          zoneObject[zone.zone][style] = zone[style];
        });
      });
    }

    res.render(path.join(__dirname, "/views/updateZones.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      selectedCategory,
      selectedSubCategory,
      defectObject,
      zoneList: zones_table.rows,
      zoneObject,
      defectOptions: defectOptions.rows,
      subDefectOptions: subDefectOptions.rows,
      categoryId,
      subcategoryId,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/addDefect", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const addingDefect = req.body.addingDefect;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO defect_table(defect,sub_category,category)VALUES('${addingDefect}','${selectedSubCategory}','${selectedCategory}')`
    );

    //  save new defect into each admins accessible report
    const username = await dbConnectedPool.query(
      `SELECT * from employee_table WHERE status='admin'`
    );

    username.rows.map(async (user_record) => {
      let accessible_charts = user_record.accessible_charts;
      accessible_charts.push(`${addingDefect} Summary`);

      await dbConnectedPool.query(
        `UPDATE employee_table SET accessible_charts=ARRAY['${accessible_charts.join(
          `','`
        )}'] WHERE id=${user_record.id}`
      );
    });

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addSubDefect", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const addingDefect = req.body.addingDefect;
    const addingSubDefect = req.body.addingSubDefect;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO sub_defect_table(sub_defect,defect,sub_category,category)VALUES('${addingSubDefect}','${addingDefect}','${selectedSubCategory}','${selectedCategory}')`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/removeDefect", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const removingDefect = req.body.removingDefect;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    console.log("removeDefect");

    const response1 = await dbConnectedPool.query(
      `DELETE FROM defect_table WHERE category='${selectedCategory}' AND sub_category='${selectedSubCategory}' AND defect='${removingDefect}'`
    );
    const response2 = await dbConnectedPool.query(
      `DELETE FROM sub_defect_table WHERE category='${selectedCategory}' AND sub_category='${selectedSubCategory}' AND defect='${removingDefect}'`
    );

    const defectResponse = await dbConnectedPool.query(
      `SELECT * FROM defect_table WHERE defect='${removingDefect}'`
    );

    if (defectResponse.rows.length == 0) {
      const username = await dbConnectedPool.query(`SELECT * from employee_table`);

      username.rows.map(async (user_record) => {
        let accessible_charts = user_record.accessible_charts;
        accessible_charts = accessible_charts.filter(
          (item) => item !== `${removingDefect} Summary`
        );

        await dbConnectedPool.query(
          `UPDATE employee_table SET accessible_charts=ARRAY['${accessible_charts.join(
            `','`
          )}'] WHERE id=${user_record.id}`
        );
      });
    }

    console.log("responses: ", response1, response2);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/removeSubDefect", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const removingDefect = req.body.removingDefect;
    const removingSubDefect = req.body.removingSubDefect;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    console.log("removeSubDefect");
    console.log(
      `DELETE FROM sub_defect_table WHERE category='${selectedCategory}' AND sub_category='${selectedSubCategory}' AND defect='${removingDefect}' AND sub_defect='${removingSubDefect}'`
    );

    await dbConnectedPool.query(
      `DELETE FROM sub_defect_table WHERE category='${selectedCategory}' AND sub_category='${selectedSubCategory}' AND defect='${removingDefect}' AND sub_defect='${removingSubDefect}'`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addZoneChecker", async (req, res) => {
  try {
    const zone = req.body.zone;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response = await dbConnectedPool.query(
      `SELECT * FROM zones_table WHERE zone=${zone}`
    );

    if (response.rows.length > 0) {
      res.sendStatus(409);
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addZone", async (req, res) => {
  try {
    const category = req.body.category;
    const sub_category = req.body.sub_category;
    const zone = req.body.zone;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO zones_table(zone,category,sub_category,top_position,bottom_position,right_position,left_position,width,top_padding,bottom_padding,right_padding,left_padding) VALUES (${zone},'${category}','${sub_category}',0,0,0,0,5,2,5,5,5)`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/removeZone", async (req, res) => {
  try {
    const zone = req.body.zone;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(`DELETE FROM zones_table WHERE zone=${zone}`);

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/editZone", async (req, res) => {
  try {
    const selectedZone = req.body.selectedZone;
    const editingZone = req.body.editingZone;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `UPDATE zones_table SET zone=${editingZone} WHERE zone=${selectedZone}`
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/updateZone", async (req, res) => {
  try {
    const selectedCategory = req.body.selectedCategory;
    const selectedSubCategory = req.body.selectedSubCategory;
    const selectedZone = req.body.selectedZone;
    const zoneWidth = req.body.zoneWidth;
    const top_position = req.body.top_position;
    const bottom_position = req.body.bottom_position;
    const left_position = req.body.left_position;
    const right_position = req.body.right_position;
    const paddingTop = req.body.paddingTop;
    const paddingBottom = req.body.paddingBottom;
    const paddingLeft = req.body.paddingLeft;
    const paddingRight = req.body.paddingRight;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `UPDATE zones_table SET top_position=${top_position},bottom_position=${bottom_position},left_position=${left_position},right_position=${right_position},width=${zoneWidth},top_padding=${paddingTop},bottom_padding=${paddingBottom},left_padding=${paddingLeft},right_padding=${paddingRight} WHERE zone=${selectedZone}; `
    );

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/uploadImage", upload.single("file"), function (req, res, next) {
  // Do something with the uploaded file
  console.log("fileName: ", req.file);
  console.log("File uploaded successfully");
  try {
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(400);
  }
});

app.post("/createSection", async (req, res) => {
  try {
    const currentUser = req.body.currentUser;
    const currentEmpID = req.body.currentEmpID;
    const companyName = req.body.companyName;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    const response2 = await dbConnectedPool.query(
      `SELECT * FROM employee_table WHERE id=${currentEmpID};`
    );

    if (response2.rows.length == 0) {
      res.redirect("/");
    }

    const categoryOptions = await dbConnectedPool.query(
      "SELECT * FROM category_options_table"
    );

    categoryOptions.rows.sort(function (a, b) {
      return a.category.localeCompare(b.category);
    });

    const subCategoryOptions = await dbConnectedPool.query(
      "SELECT * FROM sub_category_options_table"
    );

    subCategoryOptions.rows.sort(function (a, b) {
      return a.sub_category.localeCompare(b.sub_category);
    });

    const defectOptions = await dbConnectedPool.query(
      "SELECT * FROM defect_options_table"
    );

    defectOptions.rows.sort(function (a, b) {
      return a.defect.localeCompare(b.defect);
    });

    const subDefectOptions = await dbConnectedPool.query(
      "SELECT * FROM sub_defect_options_table"
    );

    subDefectOptions.rows.sort(function (a, b) {
      return a.sub_defect.localeCompare(b.sub_defect);
    });

    const emp_ChartAccess = response2.rows[0].accessible_charts;
    const emp_Status = response2.rows[0].status;

    res.render(path.join(__dirname, "/views/createSection.ejs"), {
      currentUser,
      currentEmpID,
      companyName,
      categoryOptions: categoryOptions.rows,
      subCategoryOptions: subCategoryOptions.rows,
      defectOptions: defectOptions.rows,
      subDefectOptions: subDefectOptions.rows,
      emp_ChartAccess,
      emp_Status,
    });
  } catch (err) { }
});

app.post("/addCategoryOption", async (req, res) => {
  try {
    const newCategory = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO category_options_table(category) VALUES('${newCategory.toUpperCase()}')`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/deleteCategoryOption", async (req, res) => {
  try {
    const Category = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `DELETE FROM category_options_table WHERE category='${Category}'`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addSubCategoryOption", async (req, res) => {
  try {
    const newSubCategory = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO sub_category_options_table(sub_category) VALUES('${newSubCategory.toUpperCase()}')`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/deleteSubCategoryOption", async (req, res) => {
  try {
    const SubCategory = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `DELETE FROM sub_category_options_table WHERE sub_category='${SubCategory}'`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addDefectOption", async (req, res) => {
  try {
    const newDefect = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO defect_options_table(defect) VALUES('${newDefect.toUpperCase()}')`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/deleteDefectOption", async (req, res) => {
  try {
    const Defect = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `DELETE FROM defect_options_table WHERE defect='${Defect}'`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/addSubDefectOption", async (req, res) => {
  try {
    const newSubDefect = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `INSERT INTO sub_defect_options_table(sub_defect) VALUES('${newSubDefect.toUpperCase()}')`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/deleteSubDefectOption", async (req, res) => {
  try {
    const SubDefect = req.body.value;

    let dbConnectedPool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "data_entry_systems",
      password: "admin",
      port: 5432,
    });

    await dbConnectedPool.query(
      `DELETE FROM sub_defect_options_table WHERE sub_defect='${SubDefect}'`
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.get("/logout", (req, res) => {
  try {
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(2000, () => {
  console.log(
    "Data Entry tool running on port 2000. Go to Browser and search for postgres:2000 to open."
  );
});
