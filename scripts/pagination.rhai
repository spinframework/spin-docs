let arr = params[0];
let index = params[1];
let offset = parse_int(params[2]); 

let total_pages = arr.len/offset;

// If there are any remaining posts, add an extra page
if ( arr.len%offset > 0) {
    total_pages = total_pages + 1;
}

let val = #{
    prev: "",
    next: "",
    subarr: [],
    navigation: [],
    current_page: index,
    pages: []
};

let pageIndex = 0;
do {
    val.pages.push(pageIndex);
    pageIndex = pageIndex + 1;
} while pageIndex < total_pages;

val.subarr = arr.extract(index * offset, offset);

if (arr.len > (index*offset) + offset ) {
    val.next = index + 1;
}

if index > 0 {
    if (arr.len < index*offset) {
        val.prev = arr.len/offset;
    }
    else {
        val.prev = index - 1;
    }
}

val.navigation.push(1);

if total_pages < 6 {
    for i in 2..total_pages {
        val.navigation.push(i);
    }
} else {
    if index > 2 && index < total_pages - 3 {
        val.navigation.push(0);
        val.navigation.push(index);
        val.navigation.push(index+1);
        val.navigation.push(index+2);
        val.navigation.push(0);
    } else {
        if index > total_pages - 4 {
        val.navigation.push(0);
            for i in index..total_pages {
                val.navigation.push(i);
            }
        }
        if index < 4 {
            for i in 2..index+3 {
                val.navigation.push(i);
            }
        val.navigation.push(0);
        }
    }
    
    if total_pages > 1 {
        val.navigation.push(total_pages)
    }
}

val