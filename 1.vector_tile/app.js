const Koa = require('koa');
const cors = require('koa-cors');
const geojsonvt = require('./geojson-vt')
const fs = require('fs');

const dataFile = "./data/world.json";
const dataSource = JSON.parse(fs.readFileSync(dataFile));
const tileIndex = geojsonvt(dataSource, {
    extent: 4096,
    debug: 1
});

const app = new Koa();
app.use(cors());

const replacer = function (key, value) {
    if (!value) return
    if (value.geometry) {
        let type;
        const rawType = value.type;
        let geometry = value.geometry;

        if (rawType === 1) {
            type = 'MultiPoint';
            if (geometry.length === 1) {
                type = 'Point';
                geometry = geometry[0];
            }
        } else if (rawType === 2) {
            type = 'MultiLineString';
            if (geometry.length === 1) {
                type = 'LineString';
                geometry = geometry[0];
            }
        } else if (rawType === 3) {
            type = 'Polygon';
            if (geometry.length > 1) {
                type = 'MultiPolygon';
                geometry = [geometry];
            }
        }
        return {
            'type': 'Feature',
            'geometry': {
                'type': type,
                'coordinates': geometry
            },
            'properties': value.tags
        };
    } else {
        return value;
    }
};


app.use(async (ctx, next) => {
    let path = ctx.request.path.toString()
    ctx.response.type = 'application/json';
    if (path.indexOf('.vector') !== -1) {
        const pathArr = path.substring(1, path.indexOf('.vector')).split('/')
        const x = pathArr[pathArr.length - 3]
        const y = pathArr[pathArr.length - 2]
        const z = pathArr[pathArr.length - 1]
        const data = tileIndex.getTile(Number(x), Number(y), Number(z));
        const features = JSON.stringify({
            type: 'FeatureCollection',
            features: data ? data.features : []
        }, replacer)
        ctx.response.body = features
        await next()
    } else {
        ctx.response.body = 'Error'
    }
});

app.listen(3000);
console.log('app started at port 3000...');