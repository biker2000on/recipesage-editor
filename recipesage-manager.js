const { program } = require('commander');
const axios = require('axios');
const XLSX = require('xlsx');

require('dotenv').config()

program
  .name('Recipesage CLI')
  .description('CLI to be able to export and import recipes with attached labels')
  .version('0.0.1');

program.command('export')
  .description('export recipes to Excel')
  .option('-u, --url <string>', 'Recipesage URL', 'http://localhost')
  .option('-f, --filename <string>', 'Filename', 'recipes.xlsx')
  .option('-e, --email <string>', 'Email', 'test@example.com')
  .option('-p, --password <string>', 'Password', 'badpassword')
  .action(async (options) => {
    console.log(options.url)
    await exportRecipes(options.url, options.filename)
  })
  
  program.command('import')
  .description('import recipes from Excel')
  .option('-u, --url <string>', 'Recipesage URL', 'http://localhost')
  .option('-f, --filename <string>', 'Filename', 'recipes.xlsx')
  .option('-e, --email <string>', 'Email', 'test@example.com')
  .option('-p, --password <string>', 'Password', 'badpassword')
  .action(async (options) => {
    console.log(options.url)
    await importRecipes(options.url, options.filename)
  })
program.parse();

async function exportRecipes(url, filename) {
  res = await axios.post(url + '/api/users/login', {
    email: process.env.RECIPESAGE_EMAIL,
    password: process.env.RECIPESAGE_PASSWORD
  })

  if (res.data.token) {
    try {
      recipes = (await axios.get(url + "/api/recipes/by-page", { params: { token: res.data.token, count: 500 } })).data
      recipes = recipes.data.map(c => ({
        ...c,
        labels: c.labels.map(d => d.title).join("|")
      }))
      const worksheet = XLSX.utils.json_to_sheet(recipes);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Recipes");
      XLSX.writeFile(workbook, filename, { compression: true });

    } catch (ex) {
      console.log(ex);
    }
  }
}

async function importRecipes(url, filename, separator = '|') {
  const workbook = XLSX.readFile(filename)
  let recipes = XLSX.utils.sheet_to_row_object_array(workbook.Sheets.Recipes)

  try {
    res = await axios.post(url + '/api/users/login', {
      email: "bikerhiker10@gmail.com",
      password: 'ungowa'
    })
    const token = res.data.token
    if (token) {
      let labels = new Object()
      recipes.map(recipe => {
        if (recipe.labels) {
          recipe.labels.split(separator).map(label => {
            if (Array.isArray(labels[label])) {
              labels[label].push(recipe.id)
            } else {
              labels[label] = [recipe.id]
            }
          })
        }
      })
      console.log(labels);
      for (const [label, recipeIds] of Object.entries(labels)) {
        res = await axios.post(url + '/api/labels', {
          title: label,
          recipeIds: recipeIds
        }, { params: { token: token } })
      }
      recipes.filter(r => r.delete).map(async recipe => {
        res = await axios.delete(url + '/api/recipes/' + recipe.id, { params: { token: token } })
        console.log(res);
      })
      recipes.filter(r => r.newTitle).map(async recipe => {
        res = await axios.put(url + '/api/recipes/' + recipe.id, {
          title: recipe.newTitle
        }, { params: { token: token } })
        console.log(res);
      })


    }
  } catch (ex) {
    console.log(ex);
  }
  // loop through recipes
}