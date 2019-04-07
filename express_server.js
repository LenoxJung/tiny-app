var express = require("express");
var cookieParser = require('cookie-parser');
var app = express();
var PORT = 8080; // default port 8080
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(cookieParser());

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
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
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
  let templateVars = { greeting: "Hello World!" };
  res.render("hello_world", templateVars);
});

app.get("/register", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("users_new", templateVars);
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) res.send("Response Status Code: 400");
  else if (emailCheck(req.body.email)) res.send("Response Status Code: 400");
  else {
    let id = generateRandomString();
    users[id] = { id: id, email: req.body.email, password: req.body.password };
    res.cookie("user_id", users[id].id);
    res.redirect("/urls");
  }
})

app.get("/urls", (req, res) => {
  let userID = req.cookies["user_id"];
  if (!userID) res.send("<a href=/login>Login</a> | <a href=/register>Register</a>");
  else {
    let urls = urlsForUser(userID);
    let templateVars = { urls: urls, user: users[userID] };
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  let userID = req.cookies["user_id"];
  if (!userID) res.redirect("/login");
  else {
    let templateVars = { user: users[userID] };
    res.render("urls_new", templateVars);
  }
});

app.post("/urls/:id", (req, res) => {
  let userID = req.cookies["user_id"];
  if (!userID) res.send("<a href=/login>Login</a> | <a href=/register>Register</a>");
  else if (!urlsForUser(userID)[req.params.id]) res.send("THIS EITHER DOESN'T EXIST OR IT DOESN'T BELONG TO U");
  else {
    urlDatabase[req.params.id].longURL = req.body.longURL;
    res.redirect(`/urls/${req.params.id}`);
    //res.redirect("/urls");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  let userID = req.cookies["user_id"];
  if (!userID) res.send("<a href=/login>Login</a> | <a href=/register>Register</a>");
  else if (!urlsForUser(userID)[req.params.shortURL]) res.send("THIS EITHER DOESN'T EXIST OR IT DOESN'T BELONG TO U");
  else {
    let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[userID] };
    res.render("urls_show", templateVars);
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  let userID = req.cookies["user_id"];
  if (!userID) res.send("<a href=/login>Login</a> | <a href=/register>Register</a>");
  else if (!urlsForUser(userID)[req.params.shortURL]) res.send("THIS EITHER DOESN'T EXIST OR IT DOESN'T BELONG TO U");
  else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});

app.post("/urls", (req, res) => {
  let userID = req.cookies["user_id"];
  if (!userID) res.redirect("/login");
  else {
    var randomString = generateRandomString();
    urlDatabase[randomString] = { longURL: req.body.longURL, userID: userID };
    res.redirect(`/urls/${randomString}`);
  }
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("login", templateVars);
})

app.post("/login", (req, res) => {
  let user = emailCheck(req.body.email);
  if (!user) res.send("Response Status Code: 403");
  else if (req.body.password != user.password) res.send("Response Status Code: 403");
  else {
    res.cookie("user_id", user.id);
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
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
  for (var user in users) {
    if (users[user].email == email) return users[user];
  }
}

const urlsForUser = (id) => {
  let userUrls = {};
  for (var url in urlDatabase) {
    if (urlDatabase[url].userID == id) Object.assign(userUrls, { [url]: urlDatabase[url] });
  }
  return userUrls;
}
