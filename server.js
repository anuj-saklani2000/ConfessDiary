require('dotenv').config()
const express=require("express")
const bodyParser=require("body-parser")
const ejs=require("ejs")
const mongoose=require("mongoose")
const request=require("request")
const https=require("https")
const passport=require("passport")
const passportLocalMongoose=require("passport-local-mongoose")
const findOrCreate = require('mongoose-find-or-create')
const session=require("express-session")
 const GoogleStrategy = require('passport-google-oauth20').Strategy;
 const FacebookStrategy = require('passport-facebook').Strategy;
const port=process.env.PORT||3000
mongoose.connect('mongodb+srv://anuj_saklani:anuj123@cluster0.mn7ci.mongodb.net/cusersDB');             
mongoose.set('bufferCommands', false);
const app=express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static("public"))
app.use(session({
  secret: "This is insane",
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

app.get("/",function(req,res){
  res.render("home");
})

app.get("/register",function(req,res){
  res.render("register");
})
const userSchema=new mongoose.Schema({
  username:String,
  password:String,
  googleId:String,
    facebookId:String,
  secrets:String
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)
const User=mongoose.model("confess",userSchema);



passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://mighty-island-60214.herokuapp.com/auth/google/confessions",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo",
    proxy: true
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "https://mighty-island-60214.herokuapp.com/auth/facebook/callback",
    profileFields:['id','displayName','name','email']
  },
  function(accessToken, refreshToken, profile, done) {
    User.find({facebookId: profile.id} , function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));


app.post("/register",function(req,res){
  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err) {
      res.redirect("/try")

    }
    else{
      passport.authenticate("local")(req,res,function(){
        console.log(user)
        res.redirect("/confess")
      })
    }


  });
})
app.get("/login",function(req,res){
  res.render("login");
})
app.post("/login",function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
  })
  req.login(user, function(err) {
    if (err) {
      res.redirect("/try")
     }
  else{

  passport.authenticate("local")(req,res,function(){

    res.redirect("/confess")
  })
  }
  });
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/confessions",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/confess');
  });
app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email'] }));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/confess',
                                      failureRedirect: '/login' }));

app.get("/contact",function(req,res){
  res.render("contact");
})
app.post("/contact",function(req,res){
  const a=req.body.names;
    const b=req.body.email;
      const c=req.body.number;
        const d=req.body.txt;
        const data={
          members:[{
            email_address:b,
            status:"subscribed",
            merge_fields:{
              FNAME:a,
              PHONE:c,
              LNAME:d
            }
          }]
        }
        const compress=JSON.stringify(data);
        const url="https://us5.api.mailchimp.com/3.0/lists/c109893830";
  const options={
    method:"POST",
    auth:"anuj:4fd4cad9278a1a6a8923c39c49d60f27-us5"
  }

const request=https.request(url,options,function(response){
  console.log(response.statusCode);
  response.on("data",function(data){
    console.log(JSON.parse(data));
  })
})
request.write(compress);
request.end()
})
app.get("/about",function(req,res){
  res.render("about");
})

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
  res.render("submit")
  }
  else{
    res.redirect("/login")
  }
})
app.post("/submit",function(req,res){
User.findById(req.user.id,function(err,output){
  if(err)
  {
    res.redirect("/submit")
  }
  else{
output.secrets=req.body.txt;
output.save()
res.redirect("/confess")
  }
})
})
app.get("/confess",function(req,res){
User.find({"secrets":{$ne:null}},function(err,outcome){
  if(err){
    console.log(err)
  }
  else{
    res.render("confess",{List:outcome})
  }
})
})

app.get("/try",function(req,res){
  res.render("try")
})
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
})
app.listen(port,function(){
  console.log(`Server is running at ${port} port`)
})
