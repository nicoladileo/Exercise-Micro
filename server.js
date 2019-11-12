const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const cors = require('cors')

const mongoose = require('mongoose')

var User = mongoose.model('User', {
  _id: {
    'type': 'string',
  },
  username: {
    'type': 'string'
  }
});

var Exercise = mongoose.model('Exercise', {
  userId: 'string',
  description: 'string',
  duration: 'number',
  date: 'date'
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }).then(
  () => { console.log('OK') },
  err => { console.log(err)}
);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())



app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/test', (req, res) => {
  User.create({_id:shortid.generate(),username: 'Nicola'}, function (err, data) {
  if (err) {
    console.log(err);
    res.json({'error': 'Insert KO'});   // saved!
  } else
  res.json(data);
  });
})

app.post('/api/exercise/new-user', (req,res) => {
  let username = req.body.username;
  if (username) {
    //Verifico l'esistenza
    User.find({username:username}, function(err,data) {
      if (err)
        res.json({'error': 'Insert KO'});
      if (data.length == 0) {
        User.create({_id:shortid.generate(),username: username}, function (err, user) {
          if (err) {
            res.json({'error': 'Insert KO'});   // saved!
          } else
          res.json(user);
        });
      } else {
        res.send('username already taken')
      }
    });
  }
  else
      res.send('Path `username` is required.')
})

app.post('/api/exercise/add', (req,res) => {
  if (!req.body.userId || req.body.userId.trim() == '')
    res.send('unkown _id');
  if (!req.body.description || req.body.description.trim() == '')
    res.send('Path `description` is required.');
  if (!req.body.duration || req.body.duration.trim() == '')
    res.send('Path `duration` is required.');
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = new Number(req.body.duration);
  let date = req.body.date ? new Date(req.body.date) : new Date();
  if (duration == null)
    res.send('Cast to Number failed');
  if (date == null)
    res.send('Cast to Date failed');
  User.find({_id:userId}, function(err,user) {
    if (err)
      res.json({'error': 'Query KO'});
    if (user.length == 0) {
      res.send('unkown _id');
    } else {
      Exercise.create({userId,description,duration,date}, function(err,data) {
        if (err)
          res.json({'error': 'Insert KO'});
        else 
          res.json({_id: userId, username: user[0].username, description: description, duration:duration, date:date});
      });     
    }
  })
})

app.get('/api/exercise/users', (req,res) => {
  User.find({}, function(err,data) {
    if (err)
      res.json({'error': 'Query KO'});
    else
      res.json(data);
  });
})

app.get('/api/exercise/log', (req,res) => {
  let userId = req.query.userId;
  if (!userId)
    res.send('unknown userId');
  User.find({_id:userId}, function(err,user) {
    if (err)
      res.json({'error': 'Query KO'});
    if (user.length == 0) {
      res.send('unkown _id');
    } else {
      let from = new Date(req.query.from);
      let to = new Date(req.query.to);
      let limit = new Number(req.query.limit);
      let filterQuery = {userId:userId}
      let filterDate = {}
      if (from instanceof Date && !isNaN(from))
        filterDate['$gte'] = from;
      if (to instanceof Date && !isNaN(to))
        filterDate["$lt"] = to;
      if (!limit)
        limit = 0;
      if (JSON.stringify(filterDate) !== '{}')
        filterQuery['date'] = filterDate;
      console.log(filterQuery);
      Exercise.find(filterQuery)
              .limit(limit)
              .select('-_id -__v -userId')
              .exec(function(err,data) {
                if (err)
                  res.json({'error':err+ 'Query KO'});
                else 
                  res.json({_id: userId, username: user[0].username, count: data.length, log:data});
      });
    }
  });
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
