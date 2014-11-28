var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');

var request = require('request');
var cheerio = require('cheerio');

mongoose.connect('mongodb://tianfan:g00dn3ss@ds049130.mongolab.com:49130/first_mongodb');

//mongoose.connect('mongodb://localhost:27017/nastydb_dev');

var Bear       = require('./app/models/bear')
var Restaurant       = require('./app/models/restaurant')

app.use(bodyParser.urlencoded( { extended: true } ));
app.use(bodyParser.json());

var port = process.env.PORT || 9999;

var router = express.Router();

router.use(function(req, res, next){

    console.log('Something is happening.');
    next();

});

router.get('/', function(req, res) {
    
    res.json({ message: 'yeah bro, we are on the way.'});

});


router.route('/bears')

    .post(function(req, res){

        var bear = new Bear();
        bear.name = req.body.name;

        bear.save(function(err){
            if (err) {
                res.send(err);
            }

            res.json({message: 'Bear created!'});

        });

    })

    .get(function(req, res){
        
       Bear.find(function(err, bears){
       
           if(err)
               res.send(err);

           res.json(bears);

       }); 
    });

router.route('/bears/:bear_id')
    .get(function(req, res){
        Bear.findById(req.params.bear_id, function(err, bear) {
            if (err) {
                res.send(err);
            }
            res.json(bear);
        });
    })
    .put(function(req, res){
        Bear.findById(req.params.bear_id, function(err, bear){
           if(err) {
               res.send(err);
           }
           bear.name = req.body.name;
           bear.save(function(err){
              if(err){
                  res.send(err);
              }
              res.json({ message: 'Bear updated!' });
           });
        });
    });

router.route('/restaurants')
    .post(function(req, res){

        var restaurant = new Restaurant();
        restaurant.name = req.body.name;
        restaurant.location = req.body.location;
        restaurant.city = {name: req.body.city, url: req.body.city_url};
        restaurant.health_auth = req.body.health_auth;

        restaurant.save(function(err){
            if (err) {
                res.send(err);
            }

            res.json({message: 'restaurant created!'});

        });

    })


    .get(function(req, res){
        
       Restaurant.find(function(err, restaurants){
       
           if(err)
               res.send(err);

           res.json(restaurants);

       }); 
    });

/*
 * web scraper start from here
 * */
app.get('/scrape', function(req, res){

    console.log('in the scraper now');

    url = 'http://healthspace.ca/Clients/VIHA/VIHA_Website.nsf/Food-CityList?OpenView&Count=1000';
    base_url = 'http://healthspace.ca/Clients/VIHA/VIHA_Website.nsf/';
    root_url = 'http://healthspace.ca';
    //url = 'http://www.imdb.com/title/tt1229340/';

    //going into the root city url list
    request(url, function(error, response, html){
    
        if(!error){
        
            var $ = cheerio.load(html);
            
            $( "a[target='body']" ).each(function( index ) {
                  console.log( index + ": " + $( this ).text() );
                  console.log( index + " ++++++++++++url: " + base_url + $( this ).attr("href") );

                  //going into each city
                  request(base_url+$(this).attr("href"), function(error, response, html){
                      if(!error){
                          var $ = cheerio.load(html);
                          $("td a").each(function(index){
                          
                              console.log("restaurant url:" + root_url + $(this).attr("href")); 

                              var restaurant_url = root_url + $(this).attr("href");

                              //going into each restaurant here
                              request(restaurant_url, function(error, response, html){
                              
                                  if(!error){
                                  
                                      var $ = cheerio.load(html);

                                      var inspection_url = root_url + $("td a").attr("href");
                                      var restaurant_name = $("body h2").text();
                                      var restaurant_location = $("body h2").next().children("br").get(0).nextSibling;
                                      
                                      console.log("##" + restaurant_location );
                                      //console.log("##" + restaurant_name + " Inspections: " + inspection_url);
                                      //going into each inspection

                                      request(inspection_url, function(error, response, html){
                                      
                                          if(!error){
                                          
                                              var $ = cheerio.load(html);

                                              //var
                                          
                                          }
                                      
                                      });
                                  
                                  }
                              
                              });

                          
                          });
                      
                      }
                  
                  });

            });

            res.send(html);
        
        }
    })
})


//app.use('/api', router);

app.listen(port);
console.log('Magic happens on port ' + port);
