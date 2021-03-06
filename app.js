// dependencies
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');

var routes = require('./routes/index');
var users = require('./routes/users');
var profile= require('./routes/profile');
var querys= require('./routes/querys');
var searchtool= require('./routes/searchtool');


var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var flash = require('connect-flash');
var session = require('express-session');


var dnaseq = require('./model/tumorExperiment/dnaseq');



 var configDB = require('./config/database.js');
mongoose.connect(configDB.url);
var db = mongoose.connection;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'shhsecret'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


require('./config/passport')(passport);
app.use('/', routes);
app.use('./users', users);
app.use('./profile', profile);
app.use('./querys',querys);



app.get('/searchtool', function(req, res){
    /*var experiments=["ciao", "come va?", "yeaaaaaa"];*/
    var experiments=[];

        mongoose.connection.db.listCollections().toArray(function(err, names) {
            if (err) {
                console.log(err);
            }
            names.forEach(function(e,i,a) {
                if(e.name!="users") {
                    experiments.push(e.name);
                }
            });
            res.json(experiments);
        })
});

app.get('/searchtooltumorname', function(req, res){
    var collection= findCollection(req.query.queryarray[0]);
    collection.find().distinct('tumor', function(err, tumors) {
        if (err) {
            throw err;
        } else
            res.json(tumors);
    });
});


app.get('/searchtoolGenomicFieldsName', function(req, res){
    var fields=[];
    var collection= findCollection(req.query.queryarray[0]);

    collection.schema.eachPath(function(path) {
        if(path.indexOf("information")>-1 ||path.indexOf("__v")>-1 || path.indexOf("_id")>-1 || path.indexOf("tumor")>-1) {
        }else if(path.indexOf("fields")>-1){
            collection.schema.paths.fields.schema.eachPath(function(stamp){
                if(stamp.indexOf("__v")>-1 || stamp.indexOf("_id")>-1){

                }else {
                    fields.push(stamp)
                }
            });
        }else{
            fields.push(path);
        }
    });
    res.json(fields);
});

app.get('/searchtoolGenomicFieldsData', function(req, res){
    var collection= findCollection(req.query.queryarray[0]);
        if(req.query.genomicqueryarray[req.query.genomicqueryarray.length-1].indexOf("aliquote")>-1 || req.query.genomicqueryarray[req.query.genomicqueryarray.length-1].indexOf("person")>-1 || req.query.genomicqueryarray[req.query.genomicqueryarray.length-1].indexOf("tissue")>-1) {

            collection.find({'tumor': req.query.queryarray[1]}).distinct(req.query.genomicqueryarray[req.query.genomicqueryarray.length-1], function (err, item) {
                if (err) {
                    throw err
                }else {
                    res.json(item);
                }
            });
        }else{
            collection.find({'tumor': req.query.queryarray[1]}).distinct('fields.'+req.query.genomicqueryarray[req.query.genomicqueryarray.length-1], function (err, item) {
                if (err) {
                    throw err
                }else {
                    res.json(item);
                }
            });
        }
});


app.get('/searchtoolClinicNameFields', function(req, res){

    var collection= findCollection(req.query.queryarray[0]);

    collection.find({'tumor': req.query.queryarray[1]}).distinct('information.name' , function(err, item){
        if(err){
            throw err;
        }else{
            if(item.indexOf("")>-1) {
                res.json(item);
            }
        }
    })
});


app.get('/searchtoolClinicDataFields', function(req, res){
    var collection= findCollection(req.query.queryarray[0]);
    var fieldsana=[];

    var query =collection.find({'tumor':req.query.queryarray[1]} ,{_id: 0, information: {$elemMatch: {name: req.query.clinicqueryarray[req.query.clinicqueryarray.length-1]}}});
    query.select(" information.data information.name ");
    query.exec(function(err, docs){
        if (err){
            console.log(err)
        }else {


            docs.forEach(function (elem){
                if(fieldsana.indexOf(elem.information[0].data)>-1){

                }else{
                    fieldsana.push(elem.information[0].data);
                }
            });
            if (typeof cb !== "undefined"){
                cb(docs);
            }
            res.json(fieldsana);
        }
    });
    
});




function findCollection(experimentName) {
    if(experimentName.indexOf("dnaseq")>-1){
        return dnaseq;
    }else if(experimentName.indexOf("cnv")>-1){
        return cnv;
    }else if(experimentName.indexOf("dnamethylation")>-1){
        return dnamethylation;
    }
}
app.post('/find', function (req, res){
    console.log(req.body);
    console.log(req.body.genomicName);
    console.log(req.body.genomicData);
    console.log(req.body.clinicName);
    console.log(req.body.clinicData);

    console.log(req.body.experiment);
    console.log(req.body.tumorNames);
    var finalString=[];


    for(var i=0; i<req.body.genomicName.length; i++) {
        if(req.body.genomicName[i]==="tissue"){
            var obj={tissue:req.body.genomicData[i]};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="person_id"){
            var obj={person_id:req.body.genomicData[i]};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="aliquote"){
            var obj={aliquote:req.body.genomicData[i]};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="chr"){
            var obj={fields:{$elemMatch:{chr:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="start"){
            var obj={fields:{$elemMatch:{start:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="end"){
            var obj={fields:{$elemMatch:{end:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="strand"){
            var obj={fields:{$elemMatch:{strand:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="hugo_symbol"){
            var obj={fields:{$elemMatch:{hugo_symbol:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="entrez_gene_id"){
            var obj={fields:{$elemMatch:{entrez_gene_id:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="variant_classification"){
            var obj={fields:{$elemMatch:{hugo_symbol:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="variant_classification"){
            var obj={fields:{$elemMatch:{hugo_symbol:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="variant_type"){
            var obj={fields:{$elemMatch:{variant_type:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="reference_allele"){
            var obj={fields:{$elemMatch:{reference_allele:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="tumor_seq_allele1"){
            var obj={fields:{$elemMatch:{tumor_seq_allele1:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="tumor_seq_allele2"){
            var obj={fields:{$elemMatch:{tumor_seq_allele2:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="dbsnp_rs"){
            var obj={fields:{$elemMatch:{dbsnp_rs:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="tumor_sample_barcode"){
            var obj={fields:{$elemMatch:{tumor_sample_barcode:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="matched_norm_sample_barcode"){
            var obj={fields:{$elemMatch:{matched_norm_sample_barcode:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="match_norm_seq_allele1"){
            var obj={fields:{$elemMatch:{match_norm_seq_allele1:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="match_norm_seq_allele2"){
            var obj={fields:{$elemMatch:{match_norm_seq_allele2:req.body.genomicData[i]}}};
            finalString.push(obj);
        }else if(req.body.genomicName[i]==="matched_norm_sample_uuid"){
            var obj={fields:{$elemMatch:{matched_norm_sample_uuid:req.body.genomicData[i]}}};
            finalString.push(obj);
        }




    }





    console.log(finalString);
    var a=[];
    var collection= findCollection(req.body.experiment);
    var query= collection.find({'tumor': req.body.tumorNames, $and:finalString},{_id:0});
    query.select("aliquote");
    query.exec(function(err, docs){
        if (err){
            console.log(err)
        }else {
            docs.forEach(function (elem){
                console.log(elem);
                a.push(elem);
                console.log("\n");
            });
            if (typeof cb !== "undefined"){
                cb(docs);
            }
            console.log(a);
            res.send("hello"+a);
        }
    });
    /*res.send("hello");*/


});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;