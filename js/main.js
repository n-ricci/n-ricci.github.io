// HELPERS
function parseData(d) {
  var keys = _.keys(d[0]);
  return _.map(d, function(d) {
    var o = {};
    _.each(keys, function(k) {
      if( k == 'Design' )
        o[k] = d[k];
      else
        o[k] = parseFloat(d[k]);
    });
    return o;
  });
}

function getBounds(d, paddingFactor) {
  // Find min and maxes (for the scales)
  paddingFactor = typeof paddingFactor !== 'undefined' ? paddingFactor : 1;

  var keys = _.keys(d[0]), b = {};
  _.each(keys, function(k) {
    b[k] = {};
    _.each(d, function(d) {
      if(isNaN(d[k]))
        return;
      if(b[k].min === undefined || d[k] < b[k].min)
        b[k].min = d[k];
      if(b[k].max === undefined || d[k] > b[k].max)
        b[k].max = d[k];
    });
    b[k].max > 0 ? b[k].max *= paddingFactor : b[k].max /= paddingFactor;
    b[k].min > 0 ? b[k].min /= paddingFactor : b[k].min *= paddingFactor;
  });
  return b;
}

function getCorrelation(xArray, yArray) {
  function sum(m, v) {return m + v;}
  function sumSquares(m, v) {return m + v * v;}
  function filterNaN(m, v, i) {isNaN(v) ? null : m.push(i); return m;}

  // clean the data (because we know that some values are missing)
  var xNaN = _.reduce(xArray, filterNaN , []);
  var yNaN = _.reduce(yArray, filterNaN , []);
  var include = _.intersection(xNaN, yNaN);
  var fX = _.map(include, function(d) {return xArray[d];});
  var fY = _.map(include, function(d) {return yArray[d];});

  var sumX = _.reduce(fX, sum, 0);
  var sumY = _.reduce(fY, sum, 0);
  var sumX2 = _.reduce(fX, sumSquares, 0);
  var sumY2 = _.reduce(fY, sumSquares, 0);
  var sumXY = _.reduce(fX, function(m, v, i) {return m + v * fY[i];}, 0);

  var n = fX.length;
  var ntor = ( ( sumXY ) - ( sumX * sumY / n) );
  var dtorX = sumX2 - ( sumX * sumX / n);
  var dtorY = sumY2 - ( sumY * sumY / n);
 
  var r = ntor / (Math.sqrt( dtorX * dtorY )); // Pearson ( http://www.stat.wmich.edu/s216/book/node122.html )
  var m = ntor / dtorX; // y = mx + b
  var b = ( sumY - m * sumX ) / n;

  // console.log(r, m, b);
  return {r: r, m: m, b: b};
}

d3.csv('data/Filtered-Tradespace.csv', function(data) {


  var xAxis = 'Cost', yAxis = 'Utility to Science';
  var yAxisOptions = ["Utility to Science", "Failed Downtime", "Servicing Margin"]
  // var yAxisOptions = ["Well-being"];
  var descriptions = {
    "Utility to Science" : "Utility to Science",
    "Failed Downtime" : "Failed Downtime",
    "Servicing Margin" : "Servicing Margin",
    "Cost" : "Cost (B$)"
  };

  var keys = _.keys(data[0]);
  var data = parseData(data);
  var bounds = getBounds(data, 1);


  // SVG AND D3 STUFF
  var svg = d3.select("#chart")
    .append("svg")
    .attr("width", 1000)
    .attr("height", 640);
  var xScale, yScale;



  svg.append('g')
    .classed('chart', true)
    .attr('transform', 'translate(80, -60)');

  // Build menus
  // d3.select('#x-axis-menu')
  //   .selectAll('li')
  //   .data(xAxisOptions)
  //   .enter()
  //   .append('li')
  //   .text(function(d) {return d;})
  //   .classed('selected', function(d) {
  //     return d === xAxis;
  //   })
  //   .on('click', function(d) {
  //     xAxis = d;
  //     updateChart();
  //     updateMenus();
  //   });

  d3.select('#y-axis-menu')
    .selectAll('li')
    .data(yAxisOptions)
    .enter()
    .append('li')
    .text(function(d) {return d;})
    .classed('selected', function(d) {
      return d === yAxis;
    })
    .on('click', function(d) {
      yAxis = d;
      updateChart();
      updateMenus();
    });

  // Country name
  d3.select('svg g.chart')
    .append('text')
    .attr({'id': 'designLabel', 'x': 400, 'y': 150, 'text-anchor': 'middle'})
    .style({'font-size': '60px', 'font-weight': 'bold', 'fill': '#0000ff', 'opacity': 0});

  // Best fit line (to appear behind points)
  // d3.select('svg g.chart')
  //   .append('line')
  //   .attr('id', 'bestfit');

  // Axis labels
  d3.select('svg g.chart')
    .append('text')
    .attr({'id': 'xLabel', 'x': 400, 'y': 680, 'text-anchor': 'middle'})
    .text('Cost (B$)');

  d3.select('svg g.chart')
    .append('text')
    .attr('transform', 'translate(-60, 330)rotate(-90)')
    .attr({'id': 'yLabel', 'text-anchor': 'middle'})
    .text(descriptions[yAxis]);


  // Render points
  updateScales();
  var pointColour = d3.scale.category20b();
  d3.select('svg g.chart')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', function(d) {
      return isNaN(d[xAxis]) ? d3.select(this).attr('cx') : xScale(d[xAxis]);
    })
    .attr('cy', function(d) {
      return isNaN(d[yAxis]) ? d3.select(this).attr('cy') : yScale(d[yAxis]);
    })
    .attr('fill', function(d, i) {return '#888';})   //pointColour(i);})
    .style('cursor', 'pointer')

    .on('mouseover', function(d) {
      d3.select('svg g.chart #designLabel')
        .text(d.Design)
        .transition()
        .duration(500)
        .style('opacity', 0.5);
      if (!d3.select(this).classed("selected")) {
      d3.select(this)
        // .transition()
        // .duration(500)
        .attr('r', 8)
        .style('opacity', 1)
        .style("fill", "#0000cc"); 
      } else {
        // stuff that happens in clicked state
      }
    })

       .on('click', function(d) {
      d3.select('svg g.chart #designLabel')
        .transition()
        .duration(500)
        .style('opacity', 0);
      if (!d3.select(this).classed("selected")) { // circle is in unclicked state
      color = d3.hsl(d.Design%360,0.5+(d.Design%60)/120,0.25+(d.Design%100)/200);
      d3.select("#selectedDesigns")
        .append("p")
        .attr("id","element"+d.Design).text(d.Design)
        .style({'font-weight': 'bold','color': color.toString(), 'text-anchor': 'center', 'font-size': '24px'});
      
      d3.select(this).classed("selected", true)
        .transition()
        .duration(500)
        .attr('r', 9)
        .style('opacity', 1)
        .style('fill', color.toString());
        //.style('fill', '#'+Math.floor(Math.random()*10)+Math.floor(Math.random()*10)+Math.floor(Math.random()*10));
      } else { // circle is in clicked state
        d3.select(this).classed("selected",false);
        d3.select("#selectedDesigns p#element"+d.Design).remove();
      }
    })
 
     .on('mouseout', function(d) {
      d3.select('svg g.chart #designLabel')
        .transition()
        .duration(1000)
        .style('opacity', 0);
        if (!d3.select(this).classed("selected")) { // stuff that happen in UNclicked state
        d3.select(this)
        .transition()
        .duration(1000)
        .attr('r', 5)
        .style('opacity', .5)
        .style("fill", "#888");
      } else {
        // stuff that happens in clicked state
      } 
    });

  updateChart(true);
  updateMenus();

  // Render axes
  d3.select('svg g.chart')
    .append("g")
    .attr('transform', 'translate(0, 630)')
    .attr('id', 'xAxis')
    .call(makeXAxis);

  d3.select('svg g.chart')
    .append("g")
    .attr('id', 'yAxis')
    .attr('transform', 'translate(-10, 0)')
    .call(makeYAxis);


  //// RENDERING FUNCTIONS
  function updateChart(init) {
    updateScales();

    d3.select('svg g.chart')
      .selectAll('circle')
      .transition()
      .duration(2000)
      .ease('quad-out')
      .attr('cx', function(d) {
        return isNaN(d[xAxis]) ? d3.select(this).attr('cx') : xScale(d[xAxis]);
      })
      .attr('cy', function(d) {
        return isNaN(d[yAxis]) ? d3.select(this).attr('cy') : yScale(d[yAxis]);
      })
      .attr('r', function(d) {
        if (!d3.select(this).classed("selected")) {
          return isNaN(d[xAxis]) || isNaN(d[yAxis]) ? 0 : 5;
        }
        else {
          return isNaN(d[xAxis]) || isNaN(d[yAxis]) ? 0 : 9;
        }
      })

    // Also update the axes
    d3.select('#xAxis')
      .transition()
      .call(makeXAxis);

    d3.select('#yAxis')
      .transition()
      .call(makeYAxis);

    // Update axis labels
    d3.select('#yLabel')
      .text(descriptions[yAxis]);

    // Update correlation
    var xArray = _.map(data, function(d) {return d[xAxis];});
    var yArray = _.map(data, function(d) {return d[yAxis];});
    var c = getCorrelation(xArray, yArray);
    var x1 = xScale.domain()[0], y1 = c.m * x1 + c.b;
    var x2 = xScale.domain()[1], y2 = c.m * x2 + c.b;

    // Fade in
    d3.select('#bestfit')
      .style('opacity', 0)
      .attr({'x1': xScale(x1), 'y1': yScale(y1), 'x2': xScale(x2), 'y2': yScale(y2)})
      .transition()
      .duration(1500)
      .style('opacity', 1);
  }

  function updateScales() {
    xScale = d3.scale.linear()
                    .domain([bounds[xAxis].min, bounds[xAxis].max])
                    .range([20, 780]);

    yScale = d3.scale.linear()
                    .domain([bounds[yAxis].min, bounds[yAxis].max])
                    .range([600, 100]);    
  }

  function makeXAxis(s) {
    s.call(d3.svg.axis()
      .scale(xScale)
      .orient("bottom"));
  }

  function makeYAxis(s) {
    s.call(d3.svg.axis()
      .scale(yScale)
      .orient("left"));
  }

  function updateMenus() {
    d3.select('#x-axis-menu')
      .selectAll('li')
      .classed('selected', function(d) {
        return d === xAxis;
      });
    d3.select('#y-axis-menu')
      .selectAll('li')
      .classed('selected', function(d) {
        return d === yAxis;
    });
    }  

})


