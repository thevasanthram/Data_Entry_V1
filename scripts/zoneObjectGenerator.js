const Pool = require("pg").Pool;
const fs = require("fs");
async function zoneObjectGenerator() {
 let dbConnectedPool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "data_entry_systems",
  password: "admin",
  port: 5432,
 });

 const response = await dbConnectedPool.query(`SELECT * FROM zones_table`);

 console.log("zone data sample: ", response.rows[0]);

 //  fs.writeFile("./defaultZones.js", JSON.stringify(response.rows), (err) => {
 //   if (err) {
 //    throw err;
 //   }
 //   console.log("Copied successfully");
 //  });
}

zoneObjectGenerator();
