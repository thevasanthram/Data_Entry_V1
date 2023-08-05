const Pool = require("pg").Pool;

async function dbWriter() {
 let dbConnectedPool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "data_entry_systems",
  password: "admin",
  port: 5432,
 });

 const response = await dbConnectedPool.query(
  `SELECT * FROM zones_table WHERE category='RH MAIN BODY' AND sub_category='ROOF SIDE'`
 );
 console.log(response.rows.length);

 const zone_number = await dbConnectedPool.query(
  `select max(zone) from zones_table`
 );
 let zone_num_iterator = zone_number.rows[0].max;
 console.log("preceding zone: ", zone_num_iterator);
 let arr = [];
 for (let i = 0; i < response.rows.length; i++) {
  zone_num_iterator = zone_num_iterator + 1;
  arr.push(zone_num_iterator);
 }
 console.log(arr);
 //  await Promise.all(
 //   response.rows.map(async (zone, i) => {
 //    await dbConnectedPool.query(
 //     `INSERT INTO zones_table VALUES(${arr[i]},'RH SIDE MEMBER','ROOF SIDE',${zone.top_position},${zone.bottom_position},${zone.right_position},${zone.left_position},${zone.width},${zone.top_padding},${zone.bottom_padding},${zone.right_padding},${zone.left_padding});`
 //    );
 //   })
 //  );

 console.log("done");
}

dbWriter();
