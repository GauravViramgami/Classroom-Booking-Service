let express = require('express');
let app = express();
let bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

app.use(bodyParser.json());
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(methodOverride('_method'));

var indexRoutes = require("./routes/index")
app.use("/", indexRoutes)

app.listen(process.env.PORT || 3000, function () {
    console.log("app is running...")
})