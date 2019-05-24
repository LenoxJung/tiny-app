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
  keys: ['key1']
}));

const urlDatabase = {
  "b2xVn2": { longURL: "https://www.lighthouselabs.ca", userID: "userRandomID", created: Date().substring(0, 24), visitors: { Anonymous: [] }, visits: 0 },
  "9sm5xB": { longURL: "https://www.google.com", userID: "user2RandomID", created: Date().substring(0, 24), visitors: { Anonymous: [] }, visits: 0 },
  "b6UTxQ": { longURL: "https://www.tsn.ca", userID: "user2RandomID", created: Date().substring(0, 24), visitors: { Anonymous: [] }, visits: 0 },
  "i3BoGr": { longURL: "https://www.google.ca", userID: "userRandomID", created: Date().substring(0, 24), visitors: { Anonymous: [] }, visits: 0 }
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
  //res.send("Hello!");
  if (users[req.session["user_id"]]) res.redirect("/urls");
  else res.redirect("/login")
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
  if (users[req.session["user_id"]]) res.redirect("/urls");
  else res.render("users_new");
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
});

app.get("/login", (req, res) => {
  if (users[req.session["user_id"]]) res.redirect("/urls");
  else res.render("sessions_new");
});

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

app.get("/urls", (req, res) => {
  const user = users[req.session["user_id"]];
  if (!user) res.status(403).render("sessions_new", { message: "403 Please login to see this link."});
  else {
    const urls = urlsForUser(user.id);
    const templateVars = { urls: urls, user: user };
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  const user = users[req.session["user_id"]];
  if (!user) res.redirect("/login");
  else {
    const templateVars = { user: user };
    res.render("urls_new", templateVars);
  }
});

app.post("/urls", (req, res) => {
  const user = users[req.session["user_id"]];
  if (!user) res.status(403).render("sessions_new", { message: "403 Forbidden" });
  else {
    const randomString = generateRandomString();
    urlDatabase[randomString] = { longURL: req.body.longURL, userID: user.id, created: Date().substring(0, 24), visitors: { Anonymous: [] }, visits: 0 };
    res.redirect(`/urls/${randomString}`);
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const user = users[req.session["user_id"]];
  if (!urlDatabase[req.params.shortURL]) {
    if (user) res.status(404).render("urls_index", { urls: urlsForUser(user.id), user: user, message: "404 Not Found." });
    else res.status(404).render("sessions_new", { message: "404 Not Found."});
  }
  else if (!user) res.status(403).render("sessions_new", { message: "403 Forbidden." });
  else if (!urlsForUser(user.id)[req.params.shortURL]) res.status(403).render("urls_index", { urls: urlsForUser(user.id), user: user, message: "403 Forbidden." });
  else {
    const templateVars = { shortURL: req.params.shortURL, url: urlDatabase[req.params.shortURL], user: user };
    res.render("urls_show", templateVars);
  }
});

app.put("/urls/:id", (req, res) => {
  const user = users[req.session["user_id"]];
  if (!urlDatabase[req.params.id]) res.status(404).send("404 Not Found.");
  else if (!user) res.status(403).render("sessions_new", { message: "403 Forbidden" });
  else if (!urlsForUser(user.id)[req.params.id]) res.status(403).send("403 Forbidden.");
  else {
    urlDatabase[req.params.id].longURL = req.body.longURL;
    urlDatabase[req.params.id].visits = 0;
    urlDatabase[req.params.id].visitors = { Anonymous: [] };
    //res.redirect(`/urls/${req.params.id}`);
    res.redirect("/urls");
  }
});

app.delete("/urls/:shortURL", (req, res) => {
  const user = users[req.session["user_id"]];
  if (!urlDatabase[req.params.shortURL]) res.status(404).send("404 Not Found.");
  else if (!user) res.status(403).render("sessions_new", { message: "403 Forbidden" });
  else if (!urlsForUser(user.id)[req.params.shortURL]) res.status(403).send("403 Forbidden.");
  else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});

app.get("/u/:shortURL", (req, res) => {
  const url = urlDatabase[req.params.shortURL];
  const user = users[req.session["user_id"]];
  let userID = "Anonymous";
  if (user) userID = user.id;
  if (url) {
    url.visits++;
    if (!url.visitors[userID]) url.visitors[userID] = [];
    url.visitors[userID].push(Date().substring(0, 24));
    res.redirect(url.longURL);
  }
  else if (user) res.status(404).render("urls_index", { urls: urlsForUser(user.id), user: user, message: "404 Not Found."});
  else res.render("partials/_header", { message: "404 Not Found" });
});

app.use((req, res) => {
  res.status(404).render("partials/_header", { user: users[req.session["user_id"]], message: "404 This is not the web page you are looking for." });
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
