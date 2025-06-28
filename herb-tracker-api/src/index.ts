/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * Herb Tracker API - Cloudflare Worker
 * Handles CRUD operations for herb payment and pickup tracking
 */

interface Entry {
	id?: number;
	name: string;
	date: string;
	amount: number;
	category: 'phyto' | 'tcm' | 'access';
	status: 'unpaid' | 'paid' | 'returned';
	method: 'pickup' | 'shipping';
	notes: string;
	created_at?: string;
}

// CORS headers for browser requests
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);
		const path = url.pathname;

		try {
			// Route handling
			if (path === '/api/entries' && request.method === 'GET') {
				return await getEntries(env.DB, url);
			}
			
			if (path === '/api/entries' && request.method === 'POST') {
				return await createEntry(env.DB, request);
			}
			
			if (path.startsWith('/api/entries/') && request.method === 'PUT') {
				const id = parseInt(path.split('/')[3]);
				return await updateEntry(env.DB, request, id);
			}
			
			if (path.startsWith('/api/entries/') && request.method === 'DELETE') {
				const id = parseInt(path.split('/')[3]);
				return await deleteEntry(env.DB, id);
			}

			// Health check endpoint
			if (path === '/api/health') {
				return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}

			// Root endpoint - show API info
			if (path === '/') {
				const apiInfo = {
					name: 'Herb Tracker API',
					version: '1.0.0',
					endpoints: {
						'GET /api/health': 'Health check',
						'GET /api/entries': 'Get all entries',
						'GET /api/entries?category=phyto': 'Get entries by category',
						'POST /api/entries': 'Create new entry',
						'PUT /api/entries/:id': 'Update entry',
						'DELETE /api/entries/:id': 'Delete entry'
					}
				};
				return new Response(JSON.stringify(apiInfo, null, 2), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}

			return new Response('Not Found', { status: 404, headers: corsHeaders });
		} catch (error) {
			console.error('API Error:', error);
			return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
} satisfies ExportedHandler<Env>;

// Get all entries or filter by category
async function getEntries(db: D1Database, url: URL): Promise<Response> {
	const category = url.searchParams.get('category');
	
	let query = 'SELECT * FROM entries';
	let params: any[] = [];
	
	if (category) {
		query += ' WHERE category = ?';
		params.push(category);
	}
	
	query += ' ORDER BY date DESC, created_at DESC';
	
	const result = await db.prepare(query).bind(...params).all();
	
	return new Response(JSON.stringify(result.results), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

// Create a new entry
async function createEntry(db: D1Database, request: Request): Promise<Response> {
	const entry: Entry = await request.json();
	
	// Validate required fields
	if (!entry.name || !entry.date || !entry.amount || !entry.category || !entry.status || !entry.method) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
	
	const result = await db.prepare(`
		INSERT INTO entries (name, date, amount, category, status, method, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`).bind(
		entry.name,
		entry.date,
		entry.amount,
		entry.category,
		entry.status,
		entry.method,
		entry.notes || ''
	).run();
	
	if (result.success) {
		// Get the created entry
		const newEntry = await db.prepare('SELECT * FROM entries WHERE id = ?')
			.bind(result.meta.last_row_id).first();
		
		return new Response(JSON.stringify(newEntry), {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} else {
		return new Response(JSON.stringify({ error: 'Failed to create entry' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

// Update an existing entry
async function updateEntry(db: D1Database, request: Request, id: number): Promise<Response> {
	const entry: Entry = await request.json();
	
	const result = await db.prepare(`
		UPDATE entries 
		SET name = ?, date = ?, amount = ?, category = ?, status = ?, method = ?, notes = ?
		WHERE id = ?
	`).bind(
		entry.name,
		entry.date,
		entry.amount,
		entry.category,
		entry.status,
		entry.method,
		entry.notes || '',
		id
	).run();
	
	if (result.success && result.meta.changes > 0) {
		// Get the updated entry
		const updatedEntry = await db.prepare('SELECT * FROM entries WHERE id = ?')
			.bind(id).first();
		
		return new Response(JSON.stringify(updatedEntry), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} else {
		return new Response(JSON.stringify({ error: 'Entry not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

// Delete an entry
async function deleteEntry(db: D1Database, id: number): Promise<Response> {
	const result = await db.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
	
	if (result.success && result.meta.changes > 0) {
		return new Response(JSON.stringify({ success: true }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} else {
		return new Response(JSON.stringify({ error: 'Entry not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}
