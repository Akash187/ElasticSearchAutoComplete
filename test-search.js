let express = require('express');
let bodyParser = require('body-parser');
let mongoosastic = require("mongoosastic");

let app = express();
app.use(bodyParser.json());

let mongoose = require("mongoose");

mongoose.connect('mongodb://localhost:27017/Restaurant', {useNewUrlParser: true});

let Schema = mongoose.Schema;

let recipeSchema = new Schema({
  name: {
    type: String,
    es_indexed:true,
    es_type:'text'
  },
  ingredients: {
    type: String,
    es_indexed:true,
    es_type:'text'
  },
  url: {
    type: String
  },
  image: {
    type: String
  },
  cookTime: {
    type: String
  },
  recipeYield: {
    type: String
  },
  prepTime: {
    type: String
  },
  description: {
    type: String
  }
});

recipeSchema.plugin(mongoosastic, {
  hosts: [
    'localhost:9200'
  ]
});

let Recipe = mongoose.model("Recipes", recipeSchema),
  stream = Recipe.synchronize()
  , count = 0;

stream.on('data', function(err, doc){
  count++;
});
stream.on('close', function(){
  console.log('indexed ' + count + ' documents!');
});
stream.on('error', function(err){
  console.log(err);
});

Recipe.createMapping({}, function(err, mapping){
  if(err){
    console.log('error creating mapping (you can safely ignore this)');
    console.log(err);
  }else{
    console.log('mapping created!');
    console.log(mapping);
  }
});

app.get('/all', function(req, res) {
  Recipe.find(function(err, allbooks, count) {
    console.log(allbooks.length);
    res.send(allbooks);
  });
});

app.post('/recipe', (req, res) => {
  let recipe = new Recipe({
    name: req.body.name,
    ingredients: req.body.ingredients,
    url: req.body.url,
    image: req.body.image,
    cookTime: req.body.cookTime,
    recipeYield: req.body.recipeYield,
    prepTime: req.body.prepTime,
    description: req.body.description
  });
  recipe.save().then((doc) => {
    res.send(doc);
    Recipe.synchronize();
  }, (e) => {
    res.status(400).send(e);
  });
}, (e) => {
  console.log("Error in post /recipe");
});

app.post("/search/", function(req,res) {
  let term=req.body.terms;
  Recipe.esSearch(
    { query : {
        query_string : {fields : ["name","ingredients"], query : `*${term}*`}
      },
      size: 50
    }, { hydrate:true }, function(err,results) {
      // results.hits.hits.map((each) => {
      //   console.log(each);
      // });
      console.log(results.hits.total);
      res.send({ terms:term, recipes:results.hits})
    });
});

app.listen(3000, () => {
  console.log(`Started on port 3000`);
});