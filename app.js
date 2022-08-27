//jshint esversion:6
const dotenv  = require('dotenv');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const port = process.env.PORT || 3000

const app = express();

dotenv.config();

const connection_URL = process.env.CONNECTION_URL;

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(connection_URL, {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
});

const taskSchema = new mongoose.Schema({
  task:String,
  creator:mongoose.Schema.Types.ObjectId
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Task = new mongoose.model('Task',taskSchema);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets",(req,res)=>{
  if(!req.isAuthenticated()){
    res.redirect('/login');
  }
  else{
    Task.find({creator:req.user._id},(err,taskFound)=>{
      if(err){
        res.json({error:err})
      }else{
        if(taskFound){
          res.render("secrets",{tasks:taskFound})
        }
      }
    })
  }
})

app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  }else{
    res.redirect("/login")
  }
});

app.post("/submit",(req,res)=>{
  const task = new Task({task:req.body.task,creator:req.user.id});
  task.save()
  res.redirect('/secrets')
})

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      res.json({error:err});
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.delete('/delete/:id',(req,res)=>{
  if(!req.isAuthenticated()){
    res.redirect('/login');
  }
  const {id} = req.params
  Task.findByIdAndDelete(id,function(e){
    if(e){
      res.json(e);
    }else{
      res.json({message:"deleted successfully"});
    }
  })
})




app.listen(port, function() {
  console.log("Server started");
});
