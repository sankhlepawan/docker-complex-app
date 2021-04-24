const express = require("express");
const keys = require("./keys");

const bodyParse = require("body-parser");
const cors = require("cors");


const app  = express();
app.use(cors());
app.use(bodyParse.json());

const { Pool } = require("pg");
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error', () => console.log('lost pg connection '));

pgClient
.query('CREATE TABLE IF NOT EXISTS values (number INT)')
.catch(err => console.err(err));

// Redis client setup

const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();



// express route handlers

app.get("/", (req, res) => {
    res.send("Hi there")
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res)=> {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/vlaues', async (req, res)=> {
    const index = req.body.index;
    if(+index > 40) {
        res.status(422).send("index is too high.")
    }

    redisClient.hset('values', index, 'Noting yet!');
    redisPublisher.publish('insert',index);
    pgClient.query('insert into values(number) VALUES($1)', [index]);

    res.send({working: true});
})


app.listen(5000, err => {
    console.log("Listening on 5000");
});