const express = require("express");
const cors = require("cors");
require("dotenv").config();
// const jwt = require("jsonwebtoken");
// var cookieParser = require('cookie-parser')
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

//middleware

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("blood-donation is running");
});

app.listen(port, () => {
  console.log(`blood-donation server is running on port ${port}`);
});
