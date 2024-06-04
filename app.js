const express = require("express");
require("express-async-errors");
require("dotenv").config(); // to load the .env file into the process.env object
const app = express();

app.set("view engine", "ejs");
app.use(require("body-parser").urlencoded({ extended: true }));

// seesion and db
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

// db setup
const url = process.env.MONGO_URI;
const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: url,
  collection: "mySessions",
});
store.on("error", error => console.log(error));

// session
const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};
if (app.get("env") === "production") {
  app.set("trust proxy", 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
};
app.use(session(sessionParms));

// passport init
const passport = require("passport");
const passportInit = require("./passport/passportInit");
passportInit();
app.use(passport.initialize());
app.use(passport.session());

// tools and middleware
app.use(require("connect-flash")());
app.use(require("./middleware/storeLocals"));
const auth = require("./middleware/auth");

// routes
const secretWordRouter = require("./routes/secretWord");
app.use("/sessions", require("./routes/sessionRoutes"));

app.get("/", (req, res) => {
  res.render("index");
});

app.use("/secretWord", auth, secretWordRouter);

app.use((req, res) => {
  res.status(404).send(`That page (${req.url}) was not found.`);
});

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
  console.log(err);
});

// port listener
const port = process.env.PORT || 3002;

(async () => {
  try {
    await require("./db/connect")(process.env.MONGO_URI, console.log('Connected to the DB'));
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`));
  } catch (error) {
    console.log(error);
  }
})();
