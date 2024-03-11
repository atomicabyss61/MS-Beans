import { dataStore } from './other';
import fs from 'fs';

// YOU SHOULDNT NEED TO MODIFY THE FUNCTIONS BELOW IN ITERATION 1

/*
Example usage
    let store = getData()
    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Rando'] }

    names = store.names

    names.pop()
    names.push('Jake')

    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Jake'] }
    setData(store)
*/

// Use get() to access the data
function getData(): dataStore {
  // inspired by Hayden's code from lecture 5.1
  const dbstr = fs.readFileSync('src/db.json');
  const data = JSON.parse(String(dbstr));

  return data;
}

// Use set(newData) to pass in the entire data object, with modifications made
function setData(newData: dataStore): void {
  // also inspired by Hayden's code from lecture 5.1
  const jsonstr = JSON.stringify(newData);
  fs.writeFileSync('src/db.json', jsonstr);
}

export { getData, setData };
