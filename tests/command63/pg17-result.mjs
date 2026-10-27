// A named row conversion prevents a result column called "r" from shadowing its
// enclosing table alias. Quiet psql emits one complete JSON value, including newlines.
export const wrapResult=sql=>"select coalesce(json_agg(row_to_json(command63_row)),'[]'::json) as command63_rows from ("+sql+") command63_row;";
export function parseResult(text){const rows=JSON.parse(text.trim());if(!Array.isArray(rows))throw Error('Expected a complete PostgreSQL JSON row array.');return rows;}
