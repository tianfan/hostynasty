var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');

var request = require('request');
var cheerio = require('cheerio');

mongoose.connect('mongodb://tianfan:g00dn3ss@ds049130.mongolab.com:49130/first_mongodb');

//mongoose.connect('mongodb://localhost:27017/nastydb_dev');

var Bear       = require('./app/models/bear')
var City       = require('./app/models/city')
var Inspection       = require('./app/models/inspection')
var Restaurant = require('./app/models/restaurant')


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
                  
                  var curr_city = new City();
                  curr_city.name = $(this).text();
                  curr_city.url = base_url + $(this).attr("href").replace("Count=30", "Count=2000");
                  curr_city.province = "BC";
                  curr_city.health_auth = "VIHA";
                  
                  console.log( index + ": " + curr_city.name );
                  console.log( index + " ++++++++++++url: " + curr_city.url );

                  //going into each city
                  request(curr_city.url, function(error, response, html){
                      if(!error){
                          var $ = cheerio.load(html);
                          $("tr").slice(1).each(function(index){

                              var curr_restaurant = new Restaurant(); 

                              curr_restaurant.name = $(this).children().first().find("a").text(); 
                              curr_restaurant.url = root_url + $(this).children().first().find("a").attr("href");
                              curr_restaurant.location = $(this).children().eq(2).text()
                              curr_restaurant.city = curr_city;
                          
                              console.log("restaurant name:" + curr_restaurant.name); 
                              console.log("restaurant city:" + curr_restaurant.city.name); 
                              console.log("restaurant url:" + curr_restaurant.url); 
                              //console.log("restaurant location:" + curr_restaurant.location); 

                              //going into each restaurant here
                              request(curr_restaurant.url, function(error, response, html){
                              
                                  if(!error){
                                  
                                      var $ = cheerio.load(html);

                                      var foodsafe = $("body p").eq(1).find("tr").eq(3).find("td").eq(1).text(); 
                                      //console.log("## foodsafe rating: " + foodsafe );
                                      curr_restaurant.foodsafe = foodsafe == "NO" ? false : true;
                                      
                                      $("body p").eq(3).find("tr").slice(1).each(function(index){

                                          var curr_inspect = new Inspection();
                                          curr_inspect.type = $(this).find("td").eq(0).find("a").text();
                                          curr_inspect.date = new Date($(this).find("td").eq(1).text().trim());
                                          curr_inspect.url = root_url + $(this).find("td").eq(0).find("a").attr("href");
                                          //console.log("#### curr inspect: " + curr_inspect);

                                          //going into each inspection
                                          request(curr_inspect.url, function(error, response, html){
                                              console.log("#### curr inspect: " + curr_inspect);

                                              if(!error){

                                                  var $ = cheerio.load(html);

                                                  curr_inspect.hazard_rating = $(this).find("font").attr('color', '#006600');
                                                  curr_inspect.num_critical = $("body p").eq(0).find("tr").eq(3).find("td").eq(1).text()
                                                  curr_inspect.num_non_critical = $("body p").eq(0).find("tr").eq(4).find("td").eq(1).text()


                                                  //var

                                              }

                                          });
                                           
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
