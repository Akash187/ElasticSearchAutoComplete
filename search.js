let express = require('express');
let bodyParser = require('body-parser');
let mongoosastic = require("mongoosastic");

let app = express();
app.use(express.static('static_files'));
app.use(bodyParser.json());

let mongoose = require("mongoose");

mongoose.connect('mongodb://localhost:27017/Restaurant', {useNewUrlParser: true});

let Schema = mongoose.Schema;

let recipeSchema = new Schema({
  name: {
    type: String,
    es_indexed: true,
    es_type: 'text'
  },
  ingredients: {
    type: String,
    es_indexed: true,
    es_type: 'text'
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

stream.on('data', function (err, doc) {
  count++;
});
stream.on('close', function () {
  console.log('indexed ' + count + ' documents!');
});
stream.on('error', function (err) {
  console.log(err);
});


app.get("/search/:term", function (req, res) {
  let val = req.params.term;
  let list = [];
  Recipe.esSearch(
    {
  query : {
    query_string: {fields: ["name"], query: `*${val}*`}
  }, size: 30
    }, {hydrate: false}, function (err, results) {
      results.hits.hits.map((each) => {
        list.push(each._source.name);
      });
      console.log(results.hits.total);
      res.send(list);
    });
});

app.get("/filter/:term", function (req, res) {
  let terms = req.params.term.split("&");
  let val = terms[0];
  let options = terms.slice(1);
  let filter = [];
  options.map((each) => {
    filter.push({
      term: {
        ingredients: each
      }
    })
  });
  console.log(filter);
  let list = [];
  Recipe.esSearch(
    {
      query : {
        bool: {
          must: [
            {
              query_string: {
                query: `name:*${val}*`
              }
            }
          ],
          filter: filter,
        },
      },
      size: 100
    }, {hydrate: false}, function (err, results) {
      results.hits.hits.map((each) => {
        list.push(each._source.name);
      });
      console.log(results.hits.total);
      res.send(list);
    });
});

app.listen(3000, () => {
  console.log(`Started on port 3000`);
});