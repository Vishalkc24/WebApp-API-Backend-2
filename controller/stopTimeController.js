const fs = require('fs');
const readline = require('readline');
require('dotenv').config();

let stopTimesCache = {}; // Cache for stop times by trip_id
let cachedRoutes = [];
let cachedTrips = [];
let cachedStopTimes = []; // Cache for stop times (all stop times)

// Function to reset all caches
const resetCache = () => {
  cachedRoutes = [];
  cachedTrips = [];
  cachedStopTimes = [];
  stopTimesCache = {};
  console.log("Cache has been reset");
};

// Load route and trip data from CSV and cache them
const loadRoutesAndTrips = async () => {
  try {
    // Log the file paths being used
    console.log('Loading routes from:', process.env.ROUTES_FILE_PATH);
    console.log('Loading trips from:', process.env.TRIPS_FILE_PATH);

    const routeStream = fs.createReadStream(process.env.ROUTES_FILE_PATH, 'utf8');
    const tripStream = fs.createReadStream(process.env.TRIPS_FILE_PATH, 'utf8');

    const rlRoute = readline.createInterface({
      input: routeStream,
      crlfDelay: Infinity
    });

    rlRoute.on('line', (line) => {
      if (line.trim() !== '' && !line.startsWith('route_id')) {
        const [route_id, route_desc, route_type] = line.split(',').map(item => item.trim());
        cachedRoutes.push({
          route_id: String(route_id),
          route_desc: String(route_desc),
          route_type: String(parseInt(route_type, 10) || 0) // store as string
        });
      }
    });

    const rlTrip = readline.createInterface({
      input: tripStream,
      crlfDelay: Infinity
    });

    rlTrip.on('line', (line) => {
      if (line.trim() !== '' && !line.startsWith('route_id')) {
        const [route_id, service_id, trip_id, shape_id] = line.split(',').map(item => item.trim());
        cachedTrips.push({
          route_id: String(route_id),
          service_id: String(service_id),
          trip_id: String(trip_id),
          shape_id: shape_id ? String(shape_id) : ''
        });
      }
    });

    await Promise.all([
      new Promise(resolve => rlRoute.on('close', resolve)),
      new Promise(resolve => rlTrip.on('close', resolve))
    ]);

    console.log('Route and Trip data loaded successfully.');
  } catch (error) {
    console.error('Error loading route/trip data:', error);
  }
};

// Load stop times for a specific trip from file and cache them
const loadStopTimesForTrip = async (tripIdRequested) => {
  const filePath = process.env.STOP_TIMES_FILE_PATH;
  console.log('Loading stop times for trip_id:', tripIdRequested);
  console.log('Using stop times file path:', filePath);

  try {
    const fileStream = fs.createReadStream(filePath, 'utf8');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    // Track stop times for the current trip being requested
    let stopTimesForRequestedTrip = [];

    rl.on('line', (line) => {
      if (line.trim() !== '' && !line.startsWith('trip_id')) {
        const [trip_id, arrival_time, departure_time, stop_id, stop_sequence] = line.split(',').map(item => item.trim());

        if (trip_id === tripIdRequested) {
          const stopTimeEntry = {
            trip_id: trip_id,
            arrival_time: arrival_time,
            departure_time: departure_time,
            stop_id: stop_id,
            stop_sequence: parseInt(stop_sequence, 10)
          };
          stopTimesForRequestedTrip.push(stopTimeEntry);
        }
      }
    });

    // Wait for the file to finish reading
    await new Promise(resolve => rl.on('close', resolve));

    // Once all stop times for the trip are loaded, store them in the cache
    if (stopTimesForRequestedTrip.length > 0) {
      stopTimesCache[tripIdRequested] = stopTimesForRequestedTrip;
      console.log(`Stop times for trip_id: ${tripIdRequested} have been loaded into cache.`);
    } else {
      console.log(`No stop times found for trip_id: ${tripIdRequested}`);
    }

  } catch (err) {
    console.error('Error reading stop times file:', err);
  }
};

// Controller to get stop times by trip_id
const getStopTimesByTripId = async (req, res) => {
  const tripIdRequested = String(req.params.trip_id).trim();
  console.log('Fetching stop times for trip_id:', tripIdRequested);

  if (!stopTimesCache[tripIdRequested]) {
    console.log('Stop times not found in cache, loading...');
    await loadStopTimesForTrip(tripIdRequested);
  }

  const stopTimes = stopTimesCache[tripIdRequested];
  console.log('Stop times found in cache:', stopTimes);

  if (!stopTimes || stopTimes.length === 0) {
    return res.status(404).json({ error: `trip_id: ${tripIdRequested} not found` });
  }

  res.json({ stopTimes });
};

// Controller to get route, its trips, and all stop times
const getRouteTripsStopTimes = async (req, res) => {
  const routeID = String(req.params.route_id).trim();
  console.log('Received route_id:', routeID);

  try {
    // Reset the cache before processing the request
    resetCache();

    // Now reload the routes and trips data
    await loadRoutesAndTrips();

    // Log all cached trips for debugging to check the structure
    console.log('All cached trips:', cachedTrips);

    // Get the cached route and check the format
    const route = cachedRoutes.find(r => {
      const route_id = String(r.route_id).trim();
      console.log(`Checking route in cachedRoutes: route_id = "${route_id}", expected route_id = "${routeID}"`);
      return route_id === routeID;
    });

    if (!route) {
      console.log('Route not found:', routeID);
      return res.status(404).json({ message: 'Route not found' });
    }
    console.log('Found route:', route);

    // Get the trips for this route
    const routeTrips = cachedTrips.filter(trip => {
      const tripRouteId = String(trip.route_id).trim();
      console.log(`Checking if trip route_id = "${tripRouteId}" matches routeID = "${routeID}"`);
      return tripRouteId === routeID;
    });

    console.log('Found trips for route:', routeTrips);

    if (routeTrips.length === 0) {
      console.log('No trips found for route:', routeID);
      return res.status(404).json({ message: 'No trips found for this route' });
    }

    // Create a lookup table for stop times to avoid multiple iterations
    const stopTimesLookup = {};
    for (const stop of cachedStopTimes) {
      const tripID = String(stop.trip_id).trim();
      if (!stopTimesLookup[tripID]) {
        stopTimesLookup[tripID] = [];
      }
      stopTimesLookup[tripID].push(stop);
    }
    console.log('Stop times lookup:', stopTimesLookup);

    // Prepare the stop times for each trip in parallel
    const stopTimes = await Promise.all(
      routeTrips.map(async (trip, index) => {
        const tripStopTimes = stopTimesLookup[String(trip.trip_id).trim()] || [];
        console.log(`Stop times for trip ${trip.trip_id}:`, tripStopTimes);
        return {
          [`stopTimes_${index + 1}`]: tripStopTimes
        };
      })
    );
    console.log('Stop times for all trips:', stopTimes);

    // Combine route data, trips, and stop times into the response
    const response = {
      route,
      trips: routeTrips,
      ...stopTimes.reduce((acc, curr) => ({ ...acc, ...curr }), {})
    };
    console.log('Final response:', response);

    res.json(response);
  } catch (err) {
    console.error('Error processing request:', err);
    res.status(500).json({ message: 'Error processing the request' });
  }
};

// Initialize data loading
const loadData = async () => {
  try {
    await loadRoutesAndTrips();
    console.log('Route and Trip data loaded into cache successfully.');

    // Load the stop times for a specific trip_id in chunks
    await loadStopTimesForTrip('IDFM:KOVM:170983-C00001-1084-320'); // Example trip ID
    console.log('Stop times data loaded into cache successfully.');

  } catch (err) {
    console.error('Error during data load:', err);
  }
};

loadData();

// Export controllers
module.exports = {
  getStopTimesByTripId,
  getRouteTripsStopTimes
};
