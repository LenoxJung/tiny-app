const express = require('express');
//const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
//app.use(cookieParser());
app.use(cookieSession({
  keys: ['key1', 'key2']
}));

const urlDatabase = {
  "b2xVn2": { longURL: "https://www.lighthouselabs.ca", userID: "userRandomID" },
  "9sm5xB": { longURL: "https://www.google.com", userID: "user2RandomID" },
  "b6UTxQ": { longURL: "https://www.tsn.ca", userID: "user2RandomID" },
  "i3BoGr": { longURL: "https://www.google.ca", userID: "userRandomID" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10)
  }
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  // res.send("<html><body>Hello <b>World</b></body></html>\n");
  const templateVars = { greeting: "Hello World!" };
  res.render("hello_world", templateVars);
});

app.get("/register", (req, res) => {
  res.render("users_new");
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password || emailCheck(req.body.email)) res.status(400).render("users_new", { message: "400 That email address is already in use or email and password cannot be blank." });
  else {
    const id = generateRandomString();
    const password = bcrypt.hashSync(req.body.password, 10);
    users[id] = { id: id, email: req.body.email, password: password };
    // res.cookie("user_id", users[id].id);
    req.session["user_id"] = users[id].id
    res.redirect("/urls");
  }
})

app.get("/urls", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID) res.render("partials/_header");
  else {
    const urls = urlsForUser(userID);
    const templateVars = { urls: urls, user: users[userID] };
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID) res.redirect("/login");
  else {
    const templateVars = { user: users[userID] };
    res.render("urls_new", templateVars);
  }
});

app.put("/urls/:id", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID || !urlsForUser(userID)[req.params.id]) res.status(403).render("partials/_header", { message: "403 Forbidden." });
  else {
    urlDatabase[req.params.id].longURL = req.body.longURL;
    res.redirect(`/urls/${req.params.id}`);
    //res.redirect("/urls");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID || !urlsForUser(userID)[req.params.shortURL]) res.status(403).render("partials/_header", { message: "403 Forbidden." });
  else {
    const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[userID] };
    res.render("urls_show", templateVars);
  }
});

app.delete("/urls/:shortURL", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID || !urlsForUser(userID)[req.params.shortURL]) res.status(403).render("partials/_header", { message: "403 Forbidden." });
  else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});

app.post("/urls", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID) res.redirect("/login");
  else {
    const randomString = generateRandomString();
    urlDatabase[randomString] = { longURL: req.body.longURL, userID: userID };
    res.redirect(`/urls/${randomString}`);
  }
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  res.render("sessions_new");
})

app.post("/login", (req, res) => {
  const user = emailCheck(req.body.email);
  if (!user || !bcrypt.compareSync(req.body.password, user.password)) res.status(403).render("sessions_new", { message: "403 User doesn't exist or The password you've entered is incorrect." });
  else {
    // res.cookie("user_id", user.id);
    req.session["user_id"] = user.id;
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.use((req, res) => {
  res.status(404).send("404 This is not the web page you are looking for.")
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

const generateRandomString = () => {
  let randomString = "";
  const alphaNumeric = "0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
  for (let i = 0; i < 6; i++) {
    randomString += alphaNumeric[Math.floor(Math.random() * alphaNumeric.length)];
  }
  return randomString
}

const emailCheck = (email) => {
  for (let user in users) {
    if (users[user].email == email) return users[user];
  }
}

const urlsForUser = (id) => {
  let userUrls = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID == id) Object.assign(userUrls, { [url]: urlDatabase[url] });
  }
  return userUrls;
}
