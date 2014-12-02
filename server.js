var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var request = require('request');
var cheerio = require('cheerio');

mongoose.connect('mongodb://tianfan:g00dn3ss@ds049130.mongolab.com:49130/first_mongodb');

//mongoose.connect('mongodb://localhost:27017/nastydb_dev');

var City = require('./app/models/city')
var Inspection = require('./app/models/inspection')
var Violation = require('./app/models/violation')
var Restaurant = require('./app/models/restaurant')

var Limit = 25;
var Offset = 0;
var Nexturl = "";

var geocoderProvider = 'mapquest';
var httpAdapter = 'http';

// optionnal
var extra = {
    apiKey: 'Fmjtd%7Cluurn162l9%2C20%3Do5-9wts9u', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};

var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter, extra);


app.use(bodyParser.urlencoded({
    extended: true
}));
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



router.route('/restaurants')
    .post(function(req, res){

        var restaurant = new Restaurant();
        restaurant.name = req.body.name;
        restaurant.location.streetAddress = req.body.location;
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

       if( req.query.offset != null && req.query.limit != null) {
       var query_for_count = Restaurant.find();
       var query = Restaurant.find().skip(req.query.offset).limit(req.query.limit);
       if(req.query.city != null) {
           query = query.where('city.name').equals(req.query.city);
           query_for_count = query_for_count.where('city.name').equals(req.query.city);
       }
       if(req.query.name != null) {
           query = query.where('name').equals('/^' + req.query.name + '$/i');
           query_for_count = query_for_count.where('name').equals(req.query.name);
       }
       if(req.query.foodsafe != null) {
           if(req.query.foodsafe == 'true'){
               query = query.where('foodsafe').equals(true);
               query_for_count = query_for_count.where('foodsafe').equals(true);
           }
       }
       
       
       /*if(res.get.latidude && res.get.longitude) {

           query = query.where('latitude').gt(res.get.).lt(66)

       }*/

       query.exec(function(err, restaurants) {
       
           if(err)
               res.send(err);
           
           query_for_count.count(function(err, count) {
               
               res.json({'meta': {'total': count, 'limit': req.query.limit, 'offset': req.query.offset}, Results:restaurants});
           });

       });
       }
       else{
            res.json({'error': 'must provide "limit" and "offset" in GET'});
       }
/*
       Restaurant.find({ skip: 0, limit: 5 }, function(err, restaurants){

           if(err)
               res.send(err);

           res.json(restaurants);

       });
*/
    });







/*
 * web scraper start from here
 * */
router.route('/scrape').get(function(req, res) {

    url = 'http://healthspace.ca/Clients/VIHA/VIHA_Website.nsf/Food-CityList?OpenView&Count=1000';
    base_url = 'http://healthspace.ca/Clients/VIHA/VIHA_Website.nsf/';
    root_url = 'http://healthspace.ca';
    //url = 'http://www.imdb.com/title/tt1229340/';

    //going into the root city url list
    request(url, function(error, response, html) {

        if (!error) {

            var $ = cheerio.load(html);

            $("a[target='body']").each(function(index) {

                var curr_city = new City();
                curr_city.name = $(this).text();
                curr_city.url = base_url + $(this).attr("href").replace("Count=30", "Count=2000");
                curr_city.province = "BC";
                curr_city.health_auth = "VIHA";

                //~ console.log(index + ": " + curr_city.name);
                //~ console.log(index + " ++++++++++++url: " + curr_city.url);

                //going into each city
                limitConcurrent(scrapeCity,[curr_city]);

            });

            res.send(html);

        }
    })
})


var concurrent=50;
var checkInterval=5000; //milliseconds

function limitConcurrent(thing,args){
	var wait=setInterval(function(){
		if(concurrent>0){
			clearInterval(wait);
			thing.apply(this,args);
			//thing(args);
		}else{
			//console.log(thing.name+" is waiting...");
		}
	},checkInterval);
}

function scrapeCity(curr_city){
	concurrent--;
	request(curr_city.url, function(error, response, html) {
		concurrent++;
	    if (!error) {
		var $ = cheerio.load(html);
		$("tr").slice(1).each(function(index) {

		    var curr_restaurant = new Restaurant();

		    curr_restaurant.name = $(this).children().first().find("a").text().trim();
		    curr_restaurant.url = root_url + $(this).children().first().find("a").attr("href").trim();
		    curr_restaurant.location.streetAddress = $(this).children().eq(2).text().trim();
		    curr_restaurant.location.latitude = null;
		    curr_restaurant.location.longitude = null;
		    curr_restaurant.city = curr_city;
		    curr_restaurant.inspections = [];

            // Using callback
            /*
            geocoder.geocode(curr_restaurant.location.streetAddress + ', ' + curr_restaurant.city + ', BC, Canada', function(err, res) {
                console.log(res);
                //curr_restaurant.location.latitude = res[0].latitude;
                //curr_restaurant.location.longitude = res[0].longitude;
            });        
            */
		    //~ console.log("restaurant name:" + curr_restaurant.name);
		    //~ console.log("restaurant city:" + curr_restaurant.city.name);
		    //~ console.log("restaurant url:" + curr_restaurant.url);
		    //console.log("restaurant location:" + curr_restaurant.location); 

		    //going into each restaurant here
			limitConcurrent(scrapeRestaurant,[curr_restaurant]);



		});

	    }

	});
}

function scrapeRestaurant(curr_restaurant){
	concurrent--;
    request(curr_restaurant.url, function(error, response, html) {
	    concurrent++;

	if (!error) {
	    
	    var $ = cheerio.load(html);

	    var foodsafe = $("body p").eq(1).find("tr").eq(3).find("td").eq(1).text().trim();
	    //console.log("## foodsafe rating: " + foodsafe );
	    curr_restaurant.foodsafe = foodsafe == "No" ? false : true;

	    $("body p").eq(3).find("tr").slice(1).each(function(index) {

		var curr_inspect = new Inspection();
		curr_inspect.type = $(this).find("td").eq(0).find("a").text().trim();
		curr_inspect.date = new Date($(this).find("td").eq(1).text().trim());
		curr_inspect.url = root_url + $(this).find("td").eq(0).find("a").attr("href").trim();
		curr_inspect.violations = [];
		//console.log("#### curr inspect: " + curr_inspect);

		//going into each inspection
		limitConcurrent(scrapeInspection,[curr_inspect,curr_restaurant]);

	    });

	    /*
	    curr_restaurant.save(function(err){
		if(err){
		    console.log('################%%%%%%%%%save failed%%%%%%%%%################');
		} else {
		    console.log("save successful : " + curr_restaurant);
		}
	    });
*/

	}
	
    });
}

function scrapeInspection(curr_inspect,curr_restaurant){
	concurrent--;
	
    curr_restaurant.save(function(err){
	    if(err){
	        console.log('################%%%%%%%%%save failed%%%%%%%%%################');
	    } else {
	        console.log("save successful for " + curr_restaurant.name);
	    }
	});

	request(curr_inspect.url, function(error, response, html) {
		concurrent++;
	    
	    if (!error) {

		var $ = cheerio.load(html);

		curr_inspect.hazard_rating = $(this).find("font").attr('color', '#006600');
		curr_inspect.num_critical = parseInt($("body p").eq(0).find("tr").eq(3).find("td").eq(1).text());
		curr_inspect.num_non_critical = parseInt($("body p").eq(0).find("tr").eq(4).find("td").eq(1).text());
		curr_inspect.comments = $("body p").eq(3).text();

		console.log("inspection: " + curr_inspect.num_critical+" at "+curr_restaurant.name)

		$("body p").eq(2).next().find("tr").slice(1).each(function(index) {
		    var violation = new Violation();

		    violation.code = $(this).find("td").eq(0).text();
		    violation.description = $(this).find("td").eq(1).next().text();

		    curr_inspect.violations.push(violation);

		});

		curr_restaurant.inspections.push(curr_inspect);

		//~ console.log("finished restaurant: " + curr_restaurant);
        curr_restaurant.save(function(err){
	        if(err){
	            console.log('################%%%%%%%%%save failed%%%%%%%%%################');
	        } else {
	            console.log("save successful again for: " + curr_restaurant.name);
	        }
	    });
		//var

	    }

	});
}

app.use('/api', router);

app.listen(port);
console.log('Magic happens on port ' + port);
