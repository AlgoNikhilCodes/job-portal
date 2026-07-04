import express from 'express';
import { advancedSearch, getSearchSuggestions } from '../controllers/searchController.js';

const router = express.Router();

// Static before param to avoid collision
router.get('/suggestions', getSearchSuggestions);  // GET /api/search/suggestions?q=...
router.get('/', advancedSearch);                    // GET /api/search?q=...

export default router;
