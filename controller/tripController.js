// // Import the fs module to interact with the file system
// const fs = require('fs');

// // Load environment variables from the .env file
// require('dotenv').config();

// // Controller to get all trips
// const getAllTrips = (req, res) => {
//   // Log the start of the trip retrieval process
//   console.log('Fetching all trips...');

//   // Get the file path from the environment variable
//   const filePath = process.env.TRIPS_WITH_SHAPES_FILE_PATH;

//   try {
//     // Read the file data synchronously
//     const data = fs.readFileSync(filePath, 'utf8');

//     // Split the file content by newline and filter out empty lines
//     const lines = data.split('\n').filter(line => line.trim() !== '');  // Remove empty lines

//     // Parse each line into a trip object
//     const trips = lines.slice(1).map(line => {
//       // Split each line by commas and trim extra spaces
//       const [route_id, service_id, trip_id, shape_id] = line.split(',').map(item => item.trim()); // Remove extra spaces
//       return {
//         // Parse and return the trip data
//         route_id: parseInt(route_id),
//         service_id: service_id,
//         trip_id: trip_id,
//         shape_id: shape_id
//       };
//     });

//     // Send the trips as a JSON response
//     res.json({ trips });
    
//   } catch (err) {
//     // Log any error that occurs while reading the file
//     console.error('Error reading file:', err);

//     // Send an empty array in case of an error
//     res.json({ trips: [] });
//   }
// };

// // Controller to get a trip by ID
// const getTripByID = (req, res) => {
//   const { trip_id } = req.params; // Get trip_id from route parameters

//   // Log the trip ID being fetched
//   console.log(`Fetching trip with ID: ${trip_id}`);

//   // Get the file path from the environment variable
//   const filePath = process.env.TRIPS_WITH_SHAPES_FILE_PATH;

//   try {
//     // Read the file data synchronously
//     const data = fs.readFileSync(filePath, 'utf8');

//     // Split the file content by newline and filter out empty lines
//     const lines = data.split('\n').filter(line => line.trim() !== '');  // Remove empty lines

//     // Parse each line into a trip object
//     const trips = lines.slice(1).map(line => {
//       const [route_id, service_id, trip_id_in_file, shape_id] = line.split(',').map(item => item.trim()); // Remove extra spaces
//       return {
//         route_id: parseInt(route_id),
//         service_id: service_id,
//         trip_id: trip_id_in_file,
//         shape_id: shape_id
//       };
//     });

//     // Find the trip with the matching trip_id
//     const trip = trips.find(t => t.trip_id === trip_id);

//     if (trip) {
//       // If the trip is found, send it as a JSON response
//       res.json({ trip });
//     } else {
//       // If no trip is found, return a not found message
//       res.status(404).json({ message: 'Trip not found' });
//     }

//   } catch (err) {
//     // Log any error that occurs while reading the file
//     console.error('Error reading file:', err);

//     // Send an error message in case of failure
//     res.status(500).json({ message: 'Error reading file' });
//   }
// };

// module.exports = {
//   getAllTrips,
//   getTripByID // Export the new function
// };


const fs = require('fs');
const readline = require('readline');
require('dotenv').config();

// Helper function to read and parse the trips data file efficiently
const parseTripsFile = async (filePath) => {
  try {
    // Create a readable stream from the file
    const fileStream = fs.createReadStream(filePath, 'utf8');

    // Create a readline interface to process the file line by line
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Ensures consistent line breaks across platforms
    });

    // Initialize an array to store the parsed trips
    const trips = [];

    // Skip the first line (header)
    let isFirstLine = true;

    // Read and process each line from the file
    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;  // Skip the header line
        continue;
      }

      // Split the line by commas and trim spaces (keeps the full strings intact)
      const [route_id, service_id, trip_id] = line.split(',').map(item => item.trim());

      // Push the parsed data to the trips array
      trips.push({
        route_id: route_id,  // Keep the full route_id string as it is
        service_id: service_id, // Keep the full service_id string as it is
        trip_id: trip_id // Keep the full trip_id string as it is
      });
    }

    // Return the trips array
    return trips;
  } catch (err) {
    console.error('Error reading or parsing the trips file:', err);
    throw new Error('Error reading or parsing trips file');
  }
};

// Controller to get all trips
const getAllTrips = async (req, res) => {
  console.log('Fetching all trips...');
  
  // Get the file path from the environment variable
  const filePath = process.env.TRIPS_FILE_PATH;

  try {
    // Parse the trips file asynchronously
    const trips = await parseTripsFile(filePath);
    
    // Log the trips for debugging (optional, might want to comment out in production)
    console.log('Trips:', trips);

    // Send the trips as a JSON response
    res.json({ trips });
  } catch (err) {
    // Log and send an error response
    console.error('Error fetching trips:', err);
    res.status(500).json({ message: 'Error fetching trips' });
  }
};

// Controller to get a trip by ID
const getTripByID = async (req, res) => {
  const { trip_id } = req.params;  // Get trip_id from route parameters
  console.log(`Fetching trip with ID: ${trip_id}`);

  // Get the file path from the environment variable
  const filePath = process.env.TRIPS_FILE_PATH;

  try {
    // Parse the trips file asynchronously
    const trips = await parseTripsFile(filePath);

    // Log trips for debugging
    console.log('Trips:', trips);

    // Find the trip with the matching trip_id
    const trip = trips.find(t => t.trip_id === trip_id);

    if (trip) {
      // If the trip is found, send it as a JSON response
      res.json({ trip });
    } else {
      // If no trip is found, return a not found message
      res.status(404).json({ message: 'Trip not found' });
    }
  } catch (err) {
    // Log and send an error response
    console.error('Error reading file:', err);
    res.status(500).json({ message: 'Error reading file' });
  }
};

module.exports = {
  getAllTrips,
  getTripByID
};
