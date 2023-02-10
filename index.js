const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
let RedisStore = require("connect-redis")(session);
const {
  MONGO_USER,
  MONGO_PASSWORD,
  MONGO_IP,
  MONGO_PORT,
  REDIS_URL,
  REDIS_PORT,
  SESSION_SECRET,
} = require("./config/config");

let redisClient = require("redis").createClient({
  url: `redis://${REDIS_URL}:${REDIS_PORT}`,
});
redisClient.connect().catch(console.error);

const postRouter = require("./routes/postRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();
app.use(express.json());

const mongoURL = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_IP}:${MONGO_PORT}/?authSource=admin`;

mongoose
  .connect(mongoURL)
  .then(() => {
    console.log(`Successfully connected to the db`);
  })
  .catch((err) => console.log(err));

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    saveUninitialized: false,
    secret: SESSION_SECRET,
    resave: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 30000,
    },
  })
);

app.get("/", (req, res) => {
  res.send("<h1>Hi there!!!!!!!!</h1>");
});

app.use("/api/v1/posts", postRouter);
app.use("/api/v1/users", userRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
