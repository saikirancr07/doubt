const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running at http://localhost:3000")
    );
  } catch (error) {
    console.log(`DB Error:${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Register a user
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const query = `
    SELECT * FROM user WHERE username='${username}';
  `;
  const userData = await database.get(query);
  switch (true) {
    case userData !== undefined:
      response.status(400);
      response.send("User already exists");
      break;
    case password.length < 5:
      response.status(400);
      response.send("Password is too short");
      break;
    default:
      const hashedPassword = await bcrypt.hash(password, 20);
      const postQuery = `
        INSERT INTO user (username,name,password,gender,location) VALUES ('${username}','${name}','${hashedPassword}','${gender}','${location}');
      `;
      await database.run(postQuery);
      response.status(200);
      response.send("User created successfully");
  }
});

//login page
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const query = `
    SELECT * FROM user WHERE username='${username}';
  `;
  const userData = await database.get(query);
  if (userData === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userData.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//update a password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const query = `
    SELECT * FROM user WHERE username='${username}';
    `;
  const userData = await database.get(query);
  if (userData === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      userData.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length >= 5) {
        const hashedPassword = await bcrypt.hash(newPassword, 20);
        const updateQuery = `
        UPDATE user SET password='${hashedPassword}' WHERE username='${username}';
        `;
        await database.run(updateQuery);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
