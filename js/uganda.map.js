;
(function (d3, $, queue, window) {
    'use strict';
    // https://www.humanitarianresponse.info/en/operations/afghanistan/cvwg-3w
    // https://public.tableau.com/profile/geo.gecko#!/vizhome/Districtpolygon/v1?publish=yes
    'use strict';
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }
    // function capitalizeFirstLetter(string) {
    //   return string.charAt(0).toUpperCase() + string.slice(1);
    // }

    var _selectedDataset;
    var dataset;

    queue()
    // .defer(d3.json, "./UgandaDistricts.geojson")//DNAME_06
    // This section creates a live link to the datasets when the map is loaded, so new information can be pulled in for the filters and reset.
        .defer(d3.json, "./data/UgandaDistricts.highlighted.geojson")
        .defer(d3.json, "./data/UgandaDistricts.highlighted.centroids.geojson")//dist
        .defer(d3.csv, "https://ugandarefugees.org/wp-content/uploads/Map5_T1.csv?GD_NONCE") //Actor_ID,Name,Abb,//Actor_Type
        .defer(d3.csv, "https://ugandarefugees.org/wp-content/uploads/Map5_T2.csv?GD_NONCE") //District,Settlement,Settlement_ID,Long,Lat
        .defer(d3.csv, "https://ugandarefugees.org/wp-content/uploads/Map5_T3.csv?GD_NONCE") //Sector,Sector_ID
        .defer(d3.csv, "https://ugandarefugees.org/wp-content/uploads/Map5_T4.csv?GD_NONCE") //Actor_ID,Settlement_ID,Sector_ID
        .await(ready);


//These variables contain the dynamic counts and selections based on user interaction.
    var global = {};
    global.selectedDistrict = []; // name
    global.selectedSector = []; // ID
    global.selectedSettlement = []; //undefined; //[]; // ID
    global.selectedAgency = []; // ID
    global.selectedUn = []; // Type UN
    global.selectedIp = []; // Type IP
    global.selectedOp = []; // Type OP
    global.districtCount;
    global.sectorCount;
    global.settlementCount;
    global.agencyCount;
    global.unCount;
    global.ipCount;
    global.opCount;
    global.currentEvent;

    //console.log(global.agencyCount);
    // console.log(global.selectedAgency);
    // console.log(global.selectedSector);
    // global.needRefreshDistrict;

//Function to refresh the counts when the user selects clear all
    function refreshCounts() {
        d3.select("#district-count").text(global.districtCount);
        d3.select("#sector-count").text(global.sectorCount);
        d3.select("#settlement-count").text(global.settlementCount);
        d3.select("#agency-count").text(global.agencyCount);
        d3.select("#agencyUN-count").text(global.unCount);
        d3.select("#agencyIP-count").text(global.ipCount);
        d3.select("#agencyOP-count").text(global.opCount);
        // global.selectedDistrict = [];
        global.selectedSettlement = []; //undefined; //[];
        global.selectedSector = [];
        global.selectedAgency = [];
        global.selectedUn = [];
        global.selectedIp = [];
        global.selectedOp = [];

        _selectedDataset = dataset;

    }

    function addLegend(domain, color) {
        var N = 4;
        var step = Math.round((domain[1] - domain[0]) / N);
        var array = [domain[0] + Math.round(step - step / 2), domain[0] + Math.round(step * 2 - step / 2), domain[0] + Math.round(step * 3 - step / 2), domain[0] + Math.round(step * 4 - step / 2)];
        var arrayLabel = [domain[0].toString() + " - " + (domain[0] + step).toString(), (domain[0] + step + 1).toString() + " - " + (domain[0] + step * 2).toString(), (domain[0] + step * 2 + 1).toString() + " - " + (domain[0] + step * 3).toString(), (domain[0] + step * 3 + 1).toString() + " - " + domain[1].toString()];

        var legend = d3.selectAll('.c3-legend-item');
        var legendSvg = d3.select('#legend')
            .append('svg')
            .attr('width', 150)
            .attr('height', 150);
        legend.each(function () {
            svg.node().appendChild(this);
        });

        var legendX = 0;
        var legendDY = 20;
        legendSvg.selectAll('.legend-rect')
            .data(array)
            .enter()
            .append('rect')
            .attr('class', 'legend-rect')
            .attr("x", legendX)
            .attr("y", function (d, i) {
                return (i + 1) * legendDY;
            })
            .attr("width", 20)
            .attr("height", 20)
            .style("stroke", "black")
            .style("stroke-width", 0)
            .style("fill", function (d) {
                return color(d);
            });
        //the data objects are the fill colors

        legendSvg.selectAll('.legend-text')
            .data(array)
            .enter()
            .append('text')
            .attr('class', 'legend-text')
            .attr("x", legendX + 25)
            .attr("y", function (d, i) {
                return (i) * legendDY + 25;
            })
            .attr("dy", "0.8em") //place text one line *below* the x,y point
            .text(function (d, i) {
                return arrayLabel[i];
            });

        legendSvg.selectAll('.legend-title')
            .data(["Number of Agencies"])
            .enter()
            .append('text')
            .attr('class', 'legend-title')
            .attr("x", legendX)
            .attr("y", 0)
            .attr("dy", "0.8em") //place text one line *below* the x,y point
            .text(function (d, i) {
                return d;
            });

    }

//this function is the heart and soul of the d3 map, it calls the data and defines the relationship between the tables and the SVG map.
    function ready(error, ugandaGeoJson, ugandaLabels, nameAbb, districtSettlement, sector, relationship) {
        //standard for if data is missing, the map shouldnt start.
        if (error) {
            throw error;
        }
        ;
        // console.log(ugandaGeoJson, ActorID, SettlementID, SectorID, AllID)
        ugandaGeoJson.features.map(function (d) {
            d.properties.DNAME_06 = d.properties.dist.toLowerCase().capitalize();
            // console.log(d);
        });
        //need join all data
        var nameAbbKays = d3.keys(nameAbb[0]);
        var districtSettlementKays = d3.keys(districtSettlement[0]);
        var sectorKays = d3.keys(sector[0]);
        dataset = relationship.map(function (d) {
            var i;
            for (i = 0; i < nameAbb.length; i++) {
                if (nameAbb[i].Actor_ID === d.Actor_ID) {
                    nameAbbKays.map(function (k) {
                        d[k] = nameAbb[i][k];
                    });
                    break;
                }
            }
            for (i = 0; i < districtSettlement.length; i++) {
                if (districtSettlement[i].Settlement_ID === d.Settlement_ID) {
                    districtSettlementKays.map(function (k) {
                        d[k] = districtSettlement[i][k];
                    });
                    break;
                }
            }
            for (i = 0; i < sector.length; i++) {
                if (sector[i].Sector_ID === d.Sector_ID) {
                    sectorKays.map(function (k) {
                        d[k] = sector[i][k];
                    });
                    break;
                }
            }
            return d;
        });

        //console.log(dataset);


        // http://bl.ocks.org/phoebebright/raw/3176159/
        var districtList = d3.nest().key(function (d) {
            return d.District;
        }).sortKeys(d3.ascending).entries(districtSettlement);

        //append " district" to each district name.
        // districtList.forEach(function(d){
        //     d.key = d.key + " district";
        // });
        // console.log(districtList);

        var sectorList = d3.nest().key(function (d) {
            //console.log(d);
            return d.Sector;
        }).sortKeys(d3.ascending).entries(sector);
        var settlementList = d3.nest().key(function (d) {
            return d.Settlement;
        }).sortKeys(d3.ascending).entries(districtSettlement);
        var agencyList = d3.nest().key(function (d) {
            // console.log(d);
            return d.Name;
        }).sortKeys(d3.ascending).entries(nameAbb);
//console.log(agencyList);
        var unAgencyList = nameAbb.filter(function (d) {
            if (d.Actor_Type === "UN") {
                return d.Actor_Type; //return d.Actor_Type["UN"];
            }
        });
        var ipAgencyList = nameAbb.filter(function (d) {
            if (d.Actor_Type === "IP") {
                return d.Actor_Type; //return d.Actor_Type["UN"];
            }
        });
        var opAgencyList = nameAbb.filter(function (d) {
            if (d.Actor_Type === "OP") {
                return d.Actor_Type; //return d.Actor_Type["UN"];
            }
        });
        //console.log(unFiltered);

        /* var unAgencyList = d3.nest().key(function (d) {
                 return d.Actor_Type; //return d.Actor_Type["UN"];
         }).sortKeys(d3.ascending).entries(unFiltered);
         var ipAgencyList = d3.nest().key(function (d) {
                 return d.Actor_Type;
         }).key(function (d) { return d[0]; }).sortKeys(d3.ascending).entries(ipFiltered);
         var opAgencyList = d3.nest().key(function (d) {
                 return d.Actor_Type;
         }).sortKeys(d3.ascending).entries(opFiltered);*/
        //console.log(nameAbb);

        //console.log(unAgencyList);
        //console.log(ipAgencyList);


        global.districtCount = districtList.length;
        global.sectorCount = sectorList.length;
        global.settlementCount = settlementList.length;
        global.agencyCount = agencyList.length; //to remove the count of NO DATA
        global.unCount = unAgencyList.length;
        global.ipCount = ipAgencyList.length;
        global.opCount = opAgencyList.length;

        refreshCounts();
        updateLeftPanel(districtList, sectorList, settlementList, agencyList, dataset);
        // updateLeftPanel(districtList, null, null, null, dataset);


        // d3.selectAll('.custom-list-header').on("click", function(){
        //   var customList = d3.select(this.parentNode).select("div");
        //   // if (customList.node().getBoundingClientRect().width===0){}
        //   console.log(customList.node().getBoundingClientRect());
        // });
        /*$(".custom-list-header").click(function () {
          // d3.select(this.parentNode).selectAll("p").style("background", "transparent");
          $(this).siblings(".custom-list").toggleClass('collapsed');
          // $(this).find("span").toggleClass('glyphicon-menu-down').toggleClass('glyphicon-menu-right');
        });
    */
        // Collapses all the boxes apart from district
        //$(".custom-list-header").siblings(".custom-list").addClass('collapsed');
        //$("#district-list.custom-list").removeClass('collapsed');


        var h = (window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight);
        if (h > 540) {
            d3.select(".list-container").style("height", h + "px");
            d3.select("#d3-map-wrapper").style("height", h + "px");
        }
        var w = (window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth);
        d3.select(".list-container").style("height", h - 0 + "px")

        var map = new L.Map("d3-map-container", {center: [1.367, 32.305], zoom: 7, zoomControl: false});
        var _3w_attrib = 'Created by <a href="http://www.geogecko.com">Geo Gecko</a> and © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, Powered by <a href="https://d3js.org/">d3</a>';
        var basemap = L.tileLayer("https://api.mapbox.com/styles/v1/gecko/cj27rw7wy001w2rmzx0qdl0ek/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZ2Vja28iLCJhIjoidktzSXNiVSJ9.NyDfX4V8ETtONgPKIeQmvw", {attribution: _3w_attrib});

        basemap.addTo(map);

        //temporarily disable the zoom
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.touchZoom.disable();
        map.dragging.disable();

        var wrapper = d3.select("#d3-map-wrapper");
        var width = wrapper.node().offsetWidth || 960;
        var height = wrapper.node().offsetHeight || 480; // < 480 ? h : wrapper.node().offsetHeight)  || 480;
        var domain = [+Infinity, -Infinity];
        var opacity = 0.3;
        var color = d3.scale.linear().domain(domain) //http://bl.ocks.org/jfreyre/b1882159636cc9e1283a
            .interpolate(d3.interpolateHcl)
            .range([d3.rgb("#ffe1b8"), d3.rgb('#e08114')]); //#f597aa #a02842
        var active = d3.select(null);

        var tooltip = d3.select(map.getPanes().overlayPane)
            .append("div")
            .attr("class", "d3-tooltip d3-hide");


        //d3.select("#d3-map-wrapper").selectAll("*").remove();

        //var svg = d3.select("#d3-map-wrapper")
        var svg = d3.select(map.getPanes().overlayPane)
            .append("svg")
            .on("dblclick", stopped, true)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("preserveAspectRatio", "xMidYMid")
            .attr("viewBox", "0 0 " + width + " " + height)
            .attr("width", width)
            .attr("z-index", 600)
            .attr("height", height);

        svg.append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height)
            .on("dblclick", reset, refreshMap);


        var zoom = d3.behavior.zoom()
            .translate([0, 0])
            .scale(1)
            .scaleExtent([1, 8])
            .on("zoom", zoomed);


        var g = svg.append("g")
            .attr("class", "map");
        // g.attr("transform", "translate(" + 0 + "," + 24 + ")");

        svg.call(zoom.event);

        // var mapTitle = svg.append("g")
        //   .attr("class", "mat-title")
        //   .selectAll("text")
        //   .data(["3W Map - Uganda"])
        //   .enter()
        //   .append("text")
        //   .attr("class", "neighbour")
        //   .style("font-weight", "bold")
        //   .attr("x", width / 2)
        //   .attr("y", 40)
        //   .style("text-align", "centre")
        //   .text(function (d) {
        //     return d;
        //   });

        var projection = d3.geo.mercator()
            .scale(1)
            .translate([0, 0]); //395 width/2 930 - 2400  -2400

        var path = d3.geo.path()
            .projection(projection);


        var datasetNest = d3.nest().key(function (d) {
            return d.District;
        }).entries(dataset);


        /* var transform = d3.geo.transform({point: projectPoint}),
             path = d3.geo.path().projection(transform);
   */
        var b = path.bounds(ugandaGeoJson),
            s = 5176.885757686581,
            t = [(width - 154 - s * (b[1][0] + b[0][0])) / 2, (height + 20 - s * (b[1][1] + b[0][1])) / 2];

        projection
            .scale(s)
            .translate(t);
        //console.log(b);
        var ugandaPath;
        var distLabels;

        var ugandaDistricts = g.append("g").attr("class", "uganda-districts");
        var ugandaLabelsText = g.append("g").attr("class", "uganda-districts");

        /*  var nodeFontSize = 12;

          var labels =  svg.selectAll(".circle-group")
                .data(districtSettlement)
                .enter().append("svg:text")
                .attr("class", "label")
                .each(function (d) {
                    d._coordinates = projection([d.Long, d.Lat]);
                })
                .attr("transform", function(d) { return "translate(" + d._coordinates[0] + "," + d._coordinates[1] + ")"; })
                .attr("dy", ".35em")
                .attr("font-size", nodeFontSize + "px")
                .text(function (d) { return d.Settlement });*/


        window.updateGeoPath = function updateGeoPath(ugandaGeoJson) {
            // console.log("updatePath");


            ugandaPath = ugandaDistricts
                .selectAll('.district')
                .data(ugandaGeoJson.features);

            ugandaPath
                .enter()
                .append("path")
                .attr("style", "z-index:600")
                .attr("style", "pointer-events:all!important")
                .style("cursor", "pointer")
                .style("stroke", "#fff")
                .each(function (d) {
                    d.properties.centroid = projection(d3.geo.centroid(d)); // ugandaCentroid = d.properties.centroid;
                    datasetNest.map(function (c) {
                        if (c.key === d.properties.DNAME_06) {
                            d.properties._sectorList = d3.nest().key(function (a) {
                                return a.Sector;
                            }).entries(c.values);
                            d.properties._settlementList = d3.nest().key(function (a) {
                                return a.Settlement;
                            }).entries(c.values);
                            d.properties._agencyList = d3.nest().key(function (a) {
                                return a.Name;
                            }).entries(c.values);
                            d.properties._unAgencyList = d3.nest().key(function (a) {
                                return a.Actor_Type;
                                return a.Actor_Type;
                            }).entries(c.values);
                            d.properties._ipAgencyList = d3.nest().key(function (a) {
                                return a.Actor_Type;
                            }).entries(c.values);
                            d.properties._opAgencyList = d3.nest().key(function (a) {
                                return a.Actor_Type;
                            }).entries(c.values);
                            domain[0] = d.properties._agencyList.length < domain[0] ? d.properties._agencyList.length :
                                domain[
                                    0];
                            domain[1] = d.properties._agencyList.length > domain[1] ? d.properties._agencyList.length :
                                domain[
                                    1];
                            color.domain(domain);
                        }
                    });
                })
                /*.on("mousemove", function (d) {

                  var mouse = d3.mouse(svg.node()).map(function (d) {
                    return parseInt(d);
                  });
                  var str = "<p><span>District:</span> <b>" + d.properties.DNAME_06 + "</b></p>"
                  if (d.properties._settlementList && d.properties._sectorList && d.properties._agencyList) {
                    str = str + "<p><span>Settlements:</span> <b>" + d.properties._settlementList.length + "</b></p>" +
                      "<p><span>Sectors:</span> <b>" + d.properties._sectorList.length + "</b></p>" +
                      "<p><span>Agencies:</span> <b>" + d.properties._agencyList.length + "</b></p>";
                  }
                  tooltip.html(str);

                  var box = tooltip.node().getBoundingClientRect() || {
                    height: 0
                  };


                  tooltip
                    .classed("d3-hide", false)
                    .attr("style", "left:" + (mouse[0] + 15) + "px;top:" + (mouse[1] < height / 2 ? mouse[1] : mouse[
                        1] -
                      box.height) + "px");
                })*/
                .on("mouseover", function (d) {
                    d3.select(this).style("fill", "#aaa");
                })
                .on("mouseout", function (d) {
                    d3.select(this).style("fill", d.properties._agencyList ? color(d.properties._agencyList.length) :
                        "#ccc");
                    //tooltip.classed("d3-hide", true);
                })
                .attr("d", path)
                .on("dblclick", clicked)
                .on("click", function (d) {
                    var t0 = new Date();
                    var mouse = d3.mouse(svg.node()).map(function (d) {
                        return parseInt(d);
                    });

                    if (t0 - doubleClickTime > threshold) {
                        setTimeout(function () {
                            if (t0 - doubleClickTime > threshold) {

                                var str = "<tr><button type='button' class='close' onclick='$(this).parent().hide();'>×</button></tr>" +
                                    "<th><br/></th><tr><th>District:</th> <th style='right: 0;'>" + d.properties.DNAME_06 + "</th></tr>"
                                if (d.properties._settlementList && d.properties._sectorList && d.properties._agencyList) {

                                    //console.log(d.properties._agencyList);
                                    var agencyListAbb = d3.values(d.properties._agencyList).map(function (d) {
                                        return d.values.map(function (v) {
                                            return v.Abb;
                                        });
                                    });

                                    //console.log(agencyListAbb);
                                    var tooltipList = "";
                                    var i = 0;
                                    while (i < agencyListAbb.length) {
                                        //console.log(d.properties._agencyList[i].key);
                                        tooltipList = tooltipList + ("<p>" + agencyListAbb[i][0] + "</p>");
                                        i++
                                    }
                                    //console.log(tooltipList);
                                    //console.log(d.properties);

                                    str = str + "<table style='width:100%'><tr><th>Settlements:</th> <th>" + d.properties._settlementList.length + "</th></tr>" +
                                        "<tr><th>Sectors:</th> <th>" + d.properties._sectorList.length + "</th></tr>" +
                                        "<tr><th>Partners:</th> <th>" + d.properties._agencyList.length + "</th></tr><th><br/></th><div><tr> <th style='text-align: right;'>" + tooltipList + "</th></tr></table></div>";
                                    //console.log(d.properties._agencyList);
                                }


                                tooltip.html(str);

                                var box = tooltip.node().getBoundingClientRect() || {
                                    height: 0
                                };


                                tooltip
                                    .classed("d3-hide", false)
                                    .attr("style", "left:" + (mouse[0] + 15) + "px;top:" + (mouse[1] < height / 2 ? mouse[1] : mouse[
                                            1] -
                                        box.height) + "px; min-width: 200px; max-width: 200px; height: 150px; overflow-y: scroll;");

                                tooltip
                                    .on("mouseover", function () {
                                        tooltip.classed("d3-hide", false);
                                    })
                                    .on("mouseout", function () {
                                        tooltip.classed("d3-hide", true);
                                    });

                               /* var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                                // d3.select(this).classed("d3-active", !needRemove).style("opacity", needRemove ? opacity : 1);
                                // d.properties._selected = !needRemove;
                                ugandaPath.style("opacity", function (a) {
                                  // var needRemove = $(d3.select(this).node()).hasClass("d3-active");
                                  if (a.properties.DNAME_06 === d.properties.DNAME_06) {
                                    a.properties._selected = !needRemove;
                                    return (a.properties._selected ? 1 : opacity);
                                  } else {
                                    return (a.properties._selected ? 1 : opacity);
                                  }
                                });
                                // settlements.style("opacity", opacity);
                                // d3.select(this).style("opacity", 1); //d3.selectAll(".district-" + d.properties.DNAME_06.replaceAll('[ ]', "_"))
                                // d3.select("#district-list").selectAll("p").style("background", "transparent");
                                d3.select(".district-list-" + d.properties.DNAME_06.replaceAll('[ ]', "_")).style("background",
                                  "#E3784A");
                                refreshCounts();
                                global.currentEvent = "district";
                                myFilter({
                                  "key": d.properties.DNAME_06
                                }, global.currentEvent);

                                settlements.style("opacity", 1);
                                if (global.selectedDistrict && global.selectedDistrict.length > 0) {
                                  global.selectedDistrict.map(function (dd) {
                                    d3.selectAll(".settlement-district-" + dd.key.toLowerCase().replaceAll("[ ]", "-")).style(
                                      "opacity", 1);
                                  });
                                }
                                d3.selectAll(".settlement-district-" + d.properties.DNAME_06.toLowerCase().replaceAll("[ ]", "-")).style(
                                  "opacity", 1);*/
                            }
                        }, threshold);
                    }
                })


                .style("fill", function (d) {
                    return d.properties._agencyList ? color(d.properties._agencyList.length) : "#ccc"; //#3CB371
                })
                .attr("class", function (d) {
                    return "district district-" + d.properties.DNAME_06.replaceAll('[ ]', "_");
                });
            ugandaPath //.transition().duration(duration)
                .each(function (d) {
                    d.properties.centroid = projection(d3.geo.centroid(d)); // ugandaCentroid = d.properties.centroid;
                    datasetNest.map(function (c) {
                        if (c.key === d.properties.DNAME_06) {
                            d.properties._sectorList = d3.nest().key(function (a) {
                                return a.Sector;
                            }).entries(c.values);
                            d.properties._settlementList = d3.nest().key(function (a) {
                                return a.Settlement;
                            }).entries(c.values);
                            d.properties._agencyList = d3.nest().key(function (a) {
                                return a.Name;
                            }).entries(c.values);
                            d.properties._unAgencyList = d3.nest().key(function (a) {
                                return a.Name;
                            }).entries(c.values);
                            d.properties._ipAgencyList = d3.nest().key(function (a) {
                                return a.Name;
                            }).entries(c.values);
                            d.properties._opAgencyList = d3.nest().key(function (a) {
                                return a.Name;
                            }).entries(c.values);
                            domain[0] = d.properties._agencyList.length < domain[0] ? d.properties._agencyList.length :
                                domain[
                                    0];
                            domain[1] = d.properties._agencyList.length > domain[1] ? d.properties._agencyList.length :
                                domain[
                                    1];
                            color.domain(domain);
                        }
                    });
                })
                .style("fill", function (d) {
                    return d.properties._agencyList ? color(d.properties._agencyList.length) : "#ccc"; //#3CB371
                })
                .attr("class", function (d) {
                    return "district district-" + d.properties.DNAME_06.replaceAll('[ ]', "_");
                });

            /*        var nodeFontSize = 40;

                  var distLabels = ugandaPath
                      .enter().append("svg:text")
                      .attr("class", "label")
                      .each(function (d) {
                          d.properties.centroid = projection(d3.geo.centroid(d));
                      })
                      .attr("transform", function(d) { return "translate(" + d.properties.centroid + ")"; })
                      .attr("dy", ".30em")
                      .attr("font-size", nodeFontSize + "px")
                      .text(function (d) { return d.properties.dist});*/
            /*ugandaPath.enter().append("text")
                .attr("class", "label")
                .each(function (d) {
                    //console.log(d);
                    d.properties.centroid = projection(d3.geo.centroid(d));
                })
                .attr("transform", function (d) {
                    return "translate(" + d.properties.centroid + ")";
                })
                //.attr("dy", ".30em")
                .style("color", "black")
                .style("font-size", "2px")
                // .style("opacity", 0)
                .text(function (d) {
                    var label = d.properties.dist.split(" ");
                    //console.log(label);
                    return label[0];
                });*/


            ugandaPath.exit().remove();
            // var ugandaCentroid;

        }

        //var ugandaNeighboursPath = g.append("g")
        updateGeoPath(ugandaGeoJson);

        /*var ugandaDistrictPath = g.append("g")
              .attr("class", "uganda-neighbours")
              .selectAll("path")
              .data(ugandaDistrictsGeoJson.features)
              .enter()
              .append("path")
              .attr("class", "neighbour")
              .style("fill", "transparent")
              .style("stroke", "#000")
              .attr("d", path);
    */
        var indianOcean = g.append("g")
        var ugandaNeighboursText = g.append("g")
        var domain = color.domain();
        // var array = (Array.apply(null, {
        //   length: N+1
        // }).map(Number.call, Number)).map(function(d,i){
        //   return Math.round(i*(domain[1]-domain[0])/N);
        // });

        var legendIcon1 = d3.selectAll(".icon1").append('svg')
            .attr("width", 25)
            .attr("height", 25);

        legendIcon1.append('path')
            .attr("style", "pointer-events:all!important")
            .style("fill", "#fff")
            .style("stroke", "red")
            .style("stroke-width", "0.5px")
            .attr("d", 'M 0,0 m 0.575,19.167 L 8.25,3.417 L 16.075,19.167 Z');

        var legendIcon2 = d3.selectAll(".icon2").append('svg')
            .attr("width", 15)
            .attr("height", 15);

        legendIcon2.append('circle')
            .attr("cx", 8)
            .attr("cy", 8)
            .attr("r", 5)
            .style("fill", "#fdaf40")
            .style("stroke", "black")
            .style("stroke-width", "1.5px");

        legendIcon2.append('path')
            .attr("style", "pointer-events:all!important")
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .attr("d", 'M 5,5 L 11,11 M 11,5 L 5,11');

        var legendIcon3 = d3.selectAll(".icon3").append('svg')
            .attr("width", 25)
            .attr("height", 25);

        legendIcon3.append('path')
            .attr("style", "pointer-events:all!important")
            .style("fill", "#f00")
            .style("stroke", "red")
            .style("stroke-width", "0.5px")
            .attr("d", 'M10.163,8.819c0,5.28,0,5.28,0,5.28c-1.056,1.056-1.056,1.056-1.056,1.056c0,1.047,0,1.047,0,1.047c-2.111,0-2.111,0-2.111,0c0-1.047,0-1.047,0-1.047C5.94,14.099,5.94,14.099,5.94,14.099c0-5.28,0-5.28,0-5.28c1.407-0.713,1.407-0.713,1.407-0.713C6.934,7.868,6.645,7.428,6.645,6.91c0-0.774,0.624-1.409,1.407-1.409C8.826,5.5,9.46,6.135,9.46,6.91c0,0.519-0.29,0.95-0.704,1.196L10.163,8.819z M15.84,6.707C7.911,0.371,7.911,0.371,7.911,0.371C0,6.707,0,6.707,0,6.707c0,2.112,0,2.112,0,2.112c1.848-1.479,1.848-1.479,1.848-1.479c0,8.871,0,8.871,0,8.871c1.585,0,1.585,0,1.585,0c0-10.138,0-10.138,0-10.138c4.488-3.59,4.488-3.59,4.488-3.59c4.486,3.59,4.486,3.59,4.486,3.59c0,10.138,0,10.138,0,10.138c1.585,0,1.585,0,1.585,0c0-8.871,0-8.871,0-8.871c1.848,1.479,1.848,1.479,1.848,1.479V6.707z'); //http://bl.ocks.org/dustinlarimer/5888271 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0'


        addLegend(domain, color);

        // var gNode = g.node().getBBox();
        // console.log(gNode);
        // g.attr("transform", function (d) {
        //   var x = (width-gNode.width)/2;
        //   var y = (height-gNode.height)/2;
        //   return "translate(" + x/2 + "," + y/2 + ")";
        // });

        g.append("g").attr("class", 'circle-group');
        // var localDistrictSettlement = $.extend(true, [], districtSettlement);
        var settlements = svg.select('.circle-group')
            .selectAll('.settlement')
            .data(districtSettlement);
        //console.log(settlements);
        settlements.enter().append('g')
            .attr("class", function (d) {
                return "settlement settlement-" + d.Settlement_ID + " settlement-district-" + d.District.toLowerCase().replaceAll(
                    "[ ]", "-") + " Tag" + d.Tag;
            })
            .style("cursor", "pointer")
            .on("mousemove", function (d) {
                var mouse = d3.mouse(svg.node()).map(function (d) {
                    return parseInt(d);
                });
                var str = "<p><span>Refugee site:</span> <b>" + d.Settlement + "</b></p>"
                tooltip
                    .classed("d3-hide", false)
                    .attr("style", "left:" + (mouse[0] + 15) + "px;top:" + (mouse[1]) + "px")
                    .html(str);
            })
            .on("mouseover", function (d) {
                // d3.select(this).style("fill", "#aaa");
            })
            .on("mouseout", function (d) {
                //d3.select(this).style("fill", "#fff");
                tooltip.classed("d3-hide", true);
            });
        //console.log(settlements);


        {//visualizing the settlements
            var refugeeSites1 = svg.selectAll('.Tag1');
            //console.log(refugeeSites1);
            refugeeSites1.append('path')
                .attr("style", "pointer-events:all!important")
                .style("fill", "#fff")
                .style("stroke", "red")
                .style("stroke-width", "0.5px")

            //.on("dblclick", clicked)
            /*.on("click", function (d) {
              // ugandaPath.style("opacity", opacity); //d3.selectAll(".district")
              // ugandaPath.style("opacity", function (a) {
              //   a.properties._selected = false;
              //   return opacity;
              // });
              // d3.select(".district-" + d.District.replaceAll('[ ]', "_")).style("opacity", 1);
              // d3.select("#district-list").selectAll("p").style("background", "transparent");
              // d3.select(".district-list-" + d.District.replaceAll('[ ]', "_")).style("background", "#8cc4d3");
              // refreshCounts();
              // global.selectedDistrict = [];
              // myFilter({
              //   "key": d.District
              // }, "district", false);
              // d3.select("#settlement-list").selectAll("p").style("background", "transparent");
              d3.select(".settlement-list-" + d.Settlement_ID).style("background", "#E3784A");
              // var needRemove = $(d3.select(this).node()).hasClass("d3-active");
              global.currentEvent = "settlement";
              myFilter({
                "key": d.Settlement,
                values: [{
                  "Settlement_ID": d.Settlement_ID
                }]
              }, global.currentEvent, undefined);
              settlements.style("opacity", opacity);
              // d3.select(this.parentNode).style("opacity", 1);
              global.selectedSettlement.map(function (a) {
                d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
              });
              // global.needRefreshDistrict = true;
            });*/
            var scale1 = 1.1;
            refugeeSites1 //.transition().duration(duration)
                .each(function (d) {
                    //console.log(d);
                    d._coordinates = projection([d.Long, d.Lat]);
                })
                .attr("transform", function (d) {
                    return "translate(" + d._coordinates[0] + "," + d._coordinates[1] + ")rotate(-90)scale(" + scale1 + ")";
                })
                .select("path")
                .attr("d", 'M 0,0 m -5,-5 L 5,0 L -5,5 Z'); //http://bl.ocks.org/dustinlarimer/5888271 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0'
        }

        {//visualizing the entry points
            var refugeeSites2 = svg.selectAll('.Tag2');
            //console.log(refugeeSites1);
            refugeeSites2.append('circle')
                .attr("cx", 2.5)
                .attr("cy", 2.5)
                .attr("r", 4)
                .style("fill", "#fdaf40")
                .style("stroke", "black")
                .style("stroke-width", "1px");
            refugeeSites2.append('path')
                .attr("style", "pointer-events:all!important")
                .style("stroke", "black")
                .style("stroke-width", "1px")
            var scale2 = 1.1;
            refugeeSites2 //.transition().duration(duration)
                .each(function (d) {
                    d._coordinates = projection([d.Long, d.Lat]);
                })
                .attr("transform", function (d) {
                    return "translate(" + d._coordinates[0] + "," + d._coordinates[1] + ")rotate(-90)scale(" + scale2 + ")";
                })
                .select("path")
                .attr("d", 'M 0,0 L 5,5 M 5,0 L 0,5')


        }

        {//visualizing the centres
            var refugeeSites3 = svg.selectAll('.Tag3');
            //console.log(refugeeSites1);
            refugeeSites3.append('path')
                .attr("style", "pointer-events:all!important")
                .style("fill", "#f00")
                // .style("stroke", "red")
                .style("stroke-width", "1px")
            var scale3 = 1.1;
            refugeeSites3 //.transition().duration(duration)
                .each(function (d) {
                    d._coordinates = projection([d.Long, d.Lat]);
                })
                .attr("transform", function (d) {
                    return "translate(" + d._coordinates[0] + "," + d._coordinates[1] + ")rotate(-90)scale(" + scale3 + ")";
                })
                .select("path")
                .attr("d", "M-0.367-0.317c-3.667,0-3.667,0-3.667,0C-4.767-1.05-4.767-1.05-4.767-1.05c-0.727,0-0.727,0-0.727,0c0-1.466,0-1.466,0-1.466c0.727,0,0.727,0,0.727,0c0.733-0.733,0.733-0.733,0.733-0.733c3.667,0,3.667,0,3.667,0c0.495,0.978,0.495,0.978,0.495,0.978C0.293-2.558,0.598-2.76,0.959-2.76c0.538,0,0.978,0.434,0.978,0.978c0,0.538-0.44,0.978-0.978,0.978c-0.361,0-0.66-0.202-0.831-0.489L-0.367-0.317z M1.1,3.625c4.4-5.506,4.4-5.506,4.4-5.506C1.1-7.375,1.1-7.375,1.1-7.375c-1.467,0-1.467,0-1.467,0C0.66-6.092,0.66-6.092,0.66-6.092c-6.16,0-6.16,0-6.16,0c0,1.1,0,1.1,0,1.1c7.04,0,7.04,0,7.04,0c2.493,3.117,2.493,3.117,2.493,3.117C1.54,1.242,1.54,1.242,1.54,1.242c-7.04,0-7.04,0-7.04,0c0,1.1,0,1.1,0,1.1c6.16,0,6.16,0,6.16,0c-1.027,1.283-1.027,1.283-1.027,1.283H1.1z")
        }

        /*
              var nodeFontSize = 12;

            var settlementLabels = settlements
                .enter().append("svg:text")
                .attr("class", "label")
                .each(function (d) {
                    d._coordinates = projection([d.Long, d.Lat]);
                })
                .attr("transform", function(d) { return "translate(" + d._coordinates[0] + "," + d._coordinates[1] + ")"; })
                .attr("dy", ".30em")
                .attr("font-size", nodeFontSize + "px")
                .text(function (d) { return d.Settlement});*/


        settlements.exit().remove();

        // settlements.append("title").text(function (d) {
        //   return d.Settlement;
        // });

        // zoom and pan
        // var zoom = d3.behavior.zoom().scaleExtent([1, 1])
        //   .on("zoom", function () {
        //     g.attr("transform", "translate(" +
        //       d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
        //   });
        // svg.call(zoom)


        function refreshMap() {
            // ugandaPath.style("opacity", 1);
            /*$(".custom-list-header").siblings(".custom-list").addClass('collapsed');
            $("#district-list.custom-list").removeClass('collapsed');
             */
            global.selectedDistrict = [];
            //console.log(global.selectedDistrict);
            ugandaPath.style("opacity", function (a) {
                //console.log(a);
                a.properties._selected = false;
                return 1;
            });
            d3.selectAll('.labels').style("opacity", 1);
            settlements.style("opacity", 1);
            d3.select("#district-list").selectAll("p").style("background", "transparent");
            d3.select("#sector-list").selectAll("p").style("background", "transparent");
            d3.select("#settlement-list").selectAll("p").style("background", "transparent");
            d3.select("#agency-list").selectAll("p").style("background", "transparent");
            updateLeftPanel(districtList, sectorList, settlementList, agencyList, dataset);
            //console.log(dataset);
            // updateLeftPanel(districtList, [], [], [], dataset);
            refreshCounts();
        }

        d3.select("#d3-map-refresh").on("click", refreshMap, reset);

        function makePdf() {
            if ($("#d3-map-make-pdf").hasClass('disabled')) {
                return;
            }
            $("#d3-map-make-pdf").addClass('disabled');
            var spinner = new Spinner({length: 3, radius: 4, width: 2}).spin(document.body);

            document.getElementById('d3-map-make-pdf').appendChild(spinner.el);
            reset();
            var filters = [];
            if (global.selectedDistrict.length > 0) {
                filters.push({"name": "District", "values": global.selectedDistrict})
            }
            if (global.selectedSettlement.length > 0) {
                filters.push({"name": "Settlements", "values": global.selectedSettlement})
            }
            if (global.selectedSector.length > 0) {
                filters.push({"name": "Sector", "values": global.selectedSector})
            }
            if (global.selectedAgency.length > 0) {
                filters.push({"name": "Agency", "values": global.selectedAgency})
            }
            //console.log(_selectedDataset);
            var $xhr = $.ajax({
                type: "HEAD",
                url: "https://ugandarefugees.org/wp-content/uploads/Map5_T4.csv?GD_NONCE",
            }).done(function () {
                var lastModified = new Date($xhr.getResponseHeader("Last-Modified"));
                generatePdf(map, _selectedDataset, filters, lastModified, function () {

                    $("#d3-map-make-pdf").removeClass('disabled');
                    spinner.stop();
                });
            })
        }

        d3.select("#d3-map-make-pdf").on("click", makePdf);


        // function onlyUnique(value, index, self) {
        //   console.log(value, index, self)
        //   return self.indexOf(value) === index;
        // }
        function onlyUniqueObject(data) {
            data = data.filter(function (d, index, self) {
                return self.findIndex(function (t) {
                    return t.key === d.key;
                }) === index;
            });
            return data;
        }

        function filterSelectedItem(item, c, needRemove) {
            if (needRemove) {
                global[item] = global[item].filter(function (a) {
                    return a !== c;
                });
            } else {
                global[item].push(c);
            }
            global[item] = onlyUniqueObject(global[item]); //global[item].filter(onlyUnique);;
        }


        function myFilter(c, flag, needRemove) {
            if (flag === "district") {
                filterSelectedItem("selectedDistrict", c, needRemove);
            }
            if (flag === "settlement") {
                // global.selectedSettlement = c;
                filterSelectedItem("selectedSettlement", c, needRemove);
            }
            if (flag === "sector") {
                filterSelectedItem("selectedSector", c, needRemove);
            }
            if (flag === "agency") {
                filterSelectedItem("selectedAgency", c, needRemove);
            }
            if (flag === "unAgency") {
                filterSelectedItem("selectedUn", c, needRemove);
            }
            if (flag === "ipAgency") {
                filterSelectedItem("selectedIp", c, needRemove);
            }
            if (flag === "opAgency") {
                filterSelectedItem("selectedOp", c, needRemove);
            }

            var selectedDataset = dataset.filter(function (d) { //global.selectedDataset
                var isDistrict = false; //global.selectedDistrict ? global.selectedDistrict.key === d.District : true;
                if (global.selectedDistrict.length > 0) {
                    global.selectedDistrict.map(function (c) {
                        if (c.key === d.District) {
                            isDistrict = true;
                        }
                    });
                } else {
                    isDistrict = true;
                }
                // var isSettlement = global.selectedSettlement ? global.selectedSettlement.values[0].Settlement_ID === d.Settlement_ID : true;
                var isSettlement = false;
                if (global.selectedSettlement.length > 0) {
                    global.selectedSettlement.map(function (c) {
                        if (c.values[0].Settlement_ID === d.Settlement_ID) {
                            isSettlement = true;
                        }
                    });
                } else {
                    isSettlement = true;
                }
                // var isSector = global.selectedSector ? global.selectedSector.values[0].Sector_ID === d.Sector_ID : true;
                var isSector = false;
                if (global.selectedSector.length > 0) {
                    global.selectedSector.map(function (c) {
                        if (c.values[0].Sector_ID === d.Sector_ID) {
                            isSector = true;
                        }
                    });
                } else {
                    isSector = true;
                }
                // var isAgency = global.selectedAgency ? global.selectedAgency.values[0].Actor_ID === d.Actor_ID : true;

                var isAgency = false;
                if (global.selectedAgency.length > 0) {
                    global.selectedAgency.map(function (c) {
                        if (c.values[0].Actor_ID === d.Actor_ID) {
                            isAgency = true;
                        }
                    });
                } else {
                    isAgency = true;
                }

                return isDistrict && isSettlement && isSector && isAgency;
            });

            _selectedDataset = selectedDataset;


            // console.log(selectedDataset.length, global.selectedDistrict, global.selectedSettlement, global.selectedSector, global.selectedAgency);
            //     global.selectedDistrict = []; // name
            // global.selectedSector = []; // ID
            // global.selectedSettlement = []; //undefined; //[]; // ID
            // global.selectedAgency = []; // ID

            var unExtract = selectedDataset.filter(function (d) {
                if (d.Actor_Type === "UN") {
                    return d.Actor_Type; //return d.Actor_Type["UN"];
                }
            });
            var ipExtract = selectedDataset.filter(function (d) {
                if (d.Actor_Type === "IP") {
                    return d.Actor_Type;
                }
            });
            var opExtract = selectedDataset.filter(function (d) {
                if (d.Actor_Type === "OP") {
                    return d.Actor_Type;
                }
            });
            /*console.log(unExtract);
            var reducedSelection = d3.nest().key(function (d) { if (d.Actor_Type === "UN") {return d.Actor_ID;} }).key(function(d) { return d.Name; }).entries(selectedDataset);
            console.log(selectedDataset);
            console.log(reducedSelection);
      */
            //var unReduced = reducedSelection.filter(function(d) { if (d.values.key = "UN") { /*console.log(d);*/}//return d.Actor_Type["UN"];
            // });

            //console.log(unReduced);

            var districtList = null;
            if (flag !== "district") {
                districtList = d3.nest().key(function (d) {
                    return d.District;
                }).sortKeys(d3.ascending).entries(selectedDataset);
            }

            var settlementList = null;
            if (flag !== "settlement") {
                settlementList = d3.nest().key(function (d) {
                    return d.Settlement;
                }).sortKeys(d3.ascending).entries(selectedDataset);
            }

            var sectorList = null;
            if (flag !== "sector") {
                sectorList = d3.nest().key(function (d) {
                    return d.Sector;
                }).sortKeys(d3.ascending).entries(selectedDataset);
            }

            var agencyList = null;
            if (flag !== "agency") {
                agencyList = d3.nest().key(function (d) {
                    return d.Name;
                }).sortKeys(d3.ascending).entries(selectedDataset);
            }

            var unAgencyList = null;
            if (flag !== "unAgency") {
                unAgencyList = d3.nest().key(function (d) {
                    return d.Name;
                }).sortKeys(d3.ascending).entries(unExtract);
            }

            var ipAgencyList = null;
            if (flag !== "ipAgency") {
                ipAgencyList = d3.nest().key(function (d) {
                    return d.Name;
                }).sortKeys(d3.ascending).entries(ipExtract);
            }

            var opAgencyList = null;
            if (flag !== "opAgency") {
                opAgencyList = d3.nest().key(function (d) {
                    return d.Name;
                }).sortKeys(d3.ascending).entries(opExtract);
            }
            // global.selectedDistrict = districtList;
            updateLeftPanel(districtList, sectorList, settlementList, agencyList, dataset);

            if (flag === "district") {
                d3.select("#district-count").text(global.selectedDistrict.length);
            } else {
                // global.selectedDistrict = districtList;
                d3.select("#district-count").text(districtList.length);
            }
            if (flag === "settlement") {
                d3.select("#settlement-count").text(global.selectedSettlement.length); //.text("1");
            } else {
                // global.selectedSettlement = settlementList;
                d3.select("#settlement-count").text(settlementList.length);
            }
            if (flag === "sector") {
                d3.select("#sector-count").text(global.selectedSector.length);
            } else {
                d3.select("#sector-count").text(sectorList.length);
            }
            if (flag === "agency") {
                d3.select("#agency-count").text(global.selectedAgency.length);
            } else {
                d3.select("#agency-count").text(agencyList.length);
            }
            if (flag === "unAgency") {
                d3.select("#unAgency-count").text(global.selectedUn.length);
            } else {
                d3.select("#unAgency-count").text(unAgencyList.length);
            }
            if (flag === "ipAgency") {
                d3.select("#ipAgency-count").text(global.selectedIp.length);
            } else {
                d3.select("#ipAgency-count").text(ipAgencyList.length);
            }
            if (flag === "opAgency") {
                d3.select("#opAgency-count").text(global.selectedOp.length);
            } else {
                d3.select("#opAgency-count").text(opAgencyList.length);
            }

            //console.log(selectedDataset);

        }


        function updateLeftPanel(districtList, sectorList, settlementList, agencyList, dataset) {
            //console.log(settlementList, districtList);
            //console.log(global.currentEvent);
            if (global.currentEvent !== "district") {
                d3.selectAll(".district").style("opacity", opacity);
                d3.selectAll(".labels").style("opacity", opacity);
                d3.selectAll(".settlement").style("opacity", opacity);
               // console.log(districtList);
                districtList.map(function (a) {
                    //console.log(a);
                    d3.select(".district-" + a.key.replaceAll('[ ]', "_")).style("opacity", 1);
                    d3.select(".district-" + a.key.toLowerCase().replaceAll('[ ]', "-")).style("opacity", 1);
                    a.values.map(function (b) {
                        d3.select(".settlement-" + b.Settlement_ID).style("opacity", 1);
                    });
                });
            }

            // d3.select("#district-count").text(districtList.length);
            if (districtList) {
                d3.select("#district-count").text(districtList.length);
                var _districtList = d3.select("#district-list").selectAll("p")
                    .data(districtList);
                _districtList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        // d3.select(this.parentNode).selectAll("p").style("background", "transparent");
                        // d3.select(this).style("background", "#8cc4d3");
                        settlements.style("opacity", opacity);
                        d3.selectAll(".labels").style("opacity", opacity);
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        global.currentEvent = "district";
                        myFilter(c, global.currentEvent, needRemove);
                        // myFilterBySettlement(c, undefined);
                        ugandaPath.style("opacity", function (a) {
                            if (a.properties.DNAME_06 === c.key) {
                                //console.log(a);
                                //console.log(c);
                                a.properties._selected = !needRemove;
                                return a.properties._selected ? 1 : opacity;
                            }
                            return a.properties._selected ? 1 : opacity;
                        });
                        // settlements.style("opacity", function (a) {
                        //   if (a.Settlement_ID === c.values[0].Settlement_ID) {
                        //     a._selected = !needRemove;
                        //     return a._selected ? 1 : opacity;
                        //   }
                        //   return a._selected ? 1 : opacity;
                        // });
                        // d3.select(".settlement").style("opacity", 0);
                        // d3.select(".settlement-" + c.values[0].Settlement_ID).style("opacity", 1);
                        global.selectedDistrict.map(function (a) {
                            //console.log(a);
                            d3.selectAll(".settlement-district-" + a.key.toLowerCase().replaceAll("[ ]", "-")).style("opacity", 1);
                            d3.selectAll(".district-" + a.key.toLowerCase().replaceAll('[ ]', "-")).style("opacity", 1);
                        });
                        //console.log(global.selectedDistrict.length);
                        if(global.selectedDistrict.length === 0){refreshCounts(); refreshMap();}
                    });
                _districtList
                    .attr("class", function (d) {
                        return "district-list-" + d.key.replaceAll('[ ]', "_");
                    })
                    .text(function (d) {
                        return d.key;
                    });
                _districtList.exit().remove();
            }
            /*if (districtList) {
                var _districtList = d3.select("#district-list").selectAll("p")
                    .data(districtList);
                _districtList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        // if (global.needRefreshDistrict) {
                        //   d3.select("#district-list").selectAll("p").style("background", "transparent");
                        //   global.needRefreshDistrict = false;
                        // }
                        settlements.style("opacity", opacity);
                        d3.selectAll('.labels').style("opacity", opacity);
                        if (global.selectedDistrict.length > 0) {
                            global.selectedDistrict.map(function (dd) {
                                //console.log(dd);
                                d3.selectAll(".settlement-district-" + dd.key.toLowerCase().replaceAll("[ ]", "-")).style("opacity", 1);
                                d3.select(".district-" + dd.key.toLowerCase().replaceAll('[ ]', "-")).style("opacity", 1);
                            });
                        }
                        //console.log(c);
                        c.values.map(function (ddd) {
                            d3.select(".settlement-" + ddd.Settlement_ID).style('opacity', 1);
                        });
                        // d3.select("#sector-list").selectAll("p").style("background", "transparent");
                        // d3.select("#settlement-list").selectAll("p").style("background", "transparent");
                        // d3.select("#agency-list").selectAll("p").style("background", "transparent");
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active");
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        // refreshCounts();
                        global.currentEvent = "district";
                        myFilter(c, global.currentEvent, needRemove);
                        // myFilterByDistrict(c, needRemove);
                        ugandaPath.style("opacity", function (a) {
                            if (a.properties.DNAME_06 === c.key) {
                                 //console.log(a);
                                 //console.log(c);
                                a.properties._selected = !needRemove;
                                return a.properties._selected ? 1 : opacity;
                            }
                            return a.properties._selected ? 1 : opacity;
                        });
                        //d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
                        // d3.select(".district-" + c.key.replaceAll('[ ]', "_")).style("opacity", 1);
                    });
                _districtList //.transition().duration(duration)
                    .attr("class", function (d) {
                        return "district-list-" + d.key.replaceAll('[ ]', "_");
                    })
                    .text(function (d) {
                        return d.key;
                    });
                _districtList.exit().remove();
            }*/
            if (sectorList) {
                d3.select("#sector-count").text(sectorList.length);
                var _sectorList = d3.select("#sector-list").selectAll("p")
                    .data(sectorList);
                _sectorList.enter().append("p")
                    .attr("class", function(d){
                        return d.key.replace(/\s/g,'');
                    })
                    .text(function (d) {
                        //return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        // d3.select(this.parentNode).selectAll("p").style("background", "transparent");
                        // d3.select(this).style("background", "#8cc4d3");
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        global.currentEvent = "sector";
                        myFilter(c, global.currentEvent, needRemove);
                        // myFilterBySector(c, needRemove);
                        if(global.selectedSector.length === 0){refreshCounts();}
                    });
                _sectorList //.transition().duration(duration)
                    .attr("class", function(d){
                        return d.key.replace(/\s/g,'');
                    })
                    .text(function (d) {
                        return d.key;
                    });
                _sectorList.exit().remove();
            }
            if (settlementList) {
                d3.select("#settlement-count").text(settlementList.length);
                var _settlementList = d3.select("#settlement-list").selectAll("p")
                    .data(settlementList);
                _settlementList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        // d3.select(this.parentNode).selectAll("p").style("background", "transparent");
                        // d3.select(this).style("background", "#8cc4d3");
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        global.currentEvent = "settlement";
                        myFilter(c, global.currentEvent, needRemove);
                        // myFilterBySettlement(c, undefined);
                        settlements.style("opacity", opacity);

                        // settlements.style("opacity", function (a) {
                        //   if (a.Settlement_ID === c.values[0].Settlement_ID) {
                        //     a._selected = !needRemove;
                        //     return a._selected ? 1 : opacity;
                        //   }
                        //   return a._selected ? 1 : opacity;
                        // });
                        // d3.select(".settlement").style("opacity", 0);
                        // d3.select(".settlement-" + c.values[0].Settlement_ID).style("opacity", 1);
                        global.selectedSettlement.map(function (a) {
                            //console.log(a);
                            d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
                        });
                        if(global.selectedSettlement.length === 0){refreshCounts(); refreshMap();}
                    });
                _settlementList
                    .attr("class", function (d) {
                        return "settlement-list-" + d.values[0].Settlement_ID;
                    })
                    .text(function (d) {
                        return d.key;
                    });
                _settlementList.exit().remove();
            }
            if (agencyList) {
                d3.select("#agency-count").text(agencyList.length);
                var _agencyList = d3.select("#agency-list").selectAll("p")
                    .data(agencyList);
                _agencyList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        // myFilterByAgency(c, needRemove);
                        global.currentEvent = "agency"
                        myFilter(c, global.currentEvent, needRemove);
                        // settlementList.map(function (a) {
                        //   d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
                        // });
                        // global.selectedDistrict.map(function (dd) {
                        //   d3.selectAll(".settlement-district-" + dd.key.toLowerCase().replaceAll("[ ]", "-")).style(
                        //     "opacity", 1);
                        // });
                        if(global.selectedAgency.length === 0){refreshCounts();}
                    });
                _agencyList
                    .text(function (d) {
                        return d.key;
                    });
                _agencyList.exit().remove();
            }
            if (unAgencyList) {
                d3.select("#unAgency-count").text(unAgencyList.length);
                var _unAgencyList = d3.select("#unAgency-list").selectAll("p")
                    .data(unAgencyList);
                _unAgencyList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        // myFilterByAgency(c, needRemove);
                        global.currentEvent = "unAgency"
                        myFilter(c, global.currentEvent, needRemove);
                        // settlementList.map(function (a) {
                        //   d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
                        // });
                        // global.selectedDistrict.map(function (dd) {
                        //   d3.selectAll(".settlement-district-" + dd.key.toLowerCase().replaceAll("[ ]", "-")).style(
                        //     "opacity", 1);
                        // });
                    });
                _unAgencyList
                    .text(function (d) {
                        return d.key;
                    });
                _unAgencyList.exit().remove();
            }
            if (ipAgencyList) {
                d3.select("#ipAgency-count").text(ipAgencyList.length);
                var _ipAgencyList = d3.select("#ipAgency-list").selectAll("p")
                    .data(ipAgencyList);
                _ipAgencyList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        // myFilterByAgency(c, needRemove);
                        global.currentEvent = "ipAgency"
                        myFilter(c, global.currentEvent, needRemove);
                        // settlementList.map(function (a) {
                        //   d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
                        // });
                        // global.selectedDistrict.map(function (dd) {
                        //   d3.selectAll(".settlement-district-" + dd.key.toLowerCase().replaceAll("[ ]", "-")).style(
                        //     "opacity", 1);
                        // });
                    });
                _ipAgencyList
                    .text(function (d) {
                        return d.key;
                    });
                _ipAgencyList.exit().remove();
            }
            if (opAgencyList) {
                d3.select("#opAgency-count").text(opAgencyList.length);
                var _opAgencyList = d3.select("#opAgency-list").selectAll("p")
                    .data(opAgencyList);
                _opAgencyList.enter().append("p")
                    .text(function (d) {
                        return d.key;
                    })
                    // .style("background", "transparent")
                    .on("click", function (c) {
                        var needRemove = $(d3.select(this).node()).hasClass("d3-active"); //d3.select(this).attr("class");//d3-active
                        d3.select(this).classed("d3-active", !needRemove).style("background", needRemove ? "transparent" :
                            "#E3784A");
                        // myFilterByAgency(c, needRemove);
                        global.currentEvent = "opAgency"
                        myFilter(c, global.currentEvent, needRemove);
                        // settlementList.map(function (a) {
                        //   d3.select(".settlement-" + a.values[0].Settlement_ID).style("opacity", 1);
                        // });
                        // global.selectedDistrict.map(function (dd) {
                        //   d3.selectAll(".settlement-district-" + dd.key.toLowerCase().replaceAll("[ ]", "-")).style(
                        //     "opacity", 1);
                        // });
                    });
                _opAgencyList
                    .text(function (d) {
                        return d.key;
                    });
                _opAgencyList.exit().remove();
            }

        }

        window.addEventListener("resize", function () {
            var wrapper = d3.select("#d3-map-wrapper");
            var width = wrapper.node().offsetWidth || 960;
            var height = wrapper.node().offsetHeight || 480;
            if (width) {
                d3.select("#d3-map-wrapper").select("svg")
                    .attr("viewBox", "0 0 " + width + " " + height)
                    .attr("width", width)
                    .attr("height", height);
            }
        });

        window.addEventListener('click', onClick);
        window.addEventListener('dblclick', onDoubleClick);

        var doubleClickTime = 0;
        var threshold = 200;

        function onClick() {
            var t0 = new Date();
            if (t0 - doubleClickTime > threshold) {
                setTimeout(function () {
                    if (t0 - doubleClickTime > threshold) {
                        doOnClick();
                    }
                }, threshold);
            }
        }

        function doOnClick() {
            //console.log("execute onClick function");
        }

        function onDoubleClick() {
            tooltip.classed("d3-hide", true);
            doubleClickTime = new Date();
            // console.log("execute onDoubleClick function");
        }

        /*
        setTimeout(function () {
          queue()
            .defer(d3.json, "./data/UgandaDistricts.unhighlighted.geojson") //dist
            .await(readyUnhighlighted);
        }, 100);

        function readyUnhighlighted(error, ugandaGeoJsonUnhighlighted) {
          if (error) {
            throw error;
          };
          ugandaGeoJsonUnhighlighted.features.map(function (d) {
            d.properties.DNAME_06 = d.properties.dist.toLowerCase().capitalize();
          });
          ugandaGeoJson.features = ugandaGeoJson.features.concat(ugandaGeoJsonUnhighlighted.features);
          updateGeoPath(ugandaGeoJson);
        }*/

        function clicked(d) {
            doubleClickTime = new Date();

            if (active.node() === this) return reset();
            active.classed("active", false);
            active = d3.select(this).classed("active", true);

            var bounds = path.bounds(d),
                dx = bounds[1][0] - bounds[0][0],
                dy = bounds[1][1] - bounds[0][1],
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
                translate = [width / 2 - scale * x, height / 2 - scale * y];

            map.removeLayer(basemap);


            svg.transition()
                .duration(900)
                .call(zoom.translate(translate).scale(scale).event)
                .each("end", function () {
                    d3.selectAll(".settlement").each(function () {
                        var element = d3.select(this);
                        //console.log(element);
                        element.append("text")
                            .attr("class", "label")
                            .attr("dy", "1.5em")
                            .attr("transform", "rotate(+90)")
                            .attr("font-size", "12px")
                            .style("color", "black")
                            .style("pointer-events", "none")
                            .text(function (d) {
                                //console.log(d);
                                return d.Settlement
                            });
                    });

                    distLabels = ugandaLabelsText.selectAll('.district')
                        .data(ugandaLabels.features);
                    distLabels.enter().append("text")
                        .attr("class", function (d) {
                            //console.log(d);
                            return "labels district district-" + d.properties.dist.toLowerCase().replaceAll('[ ]', "-");
                        })
                        .each(function(d) {
                            //console.log(d);
                            d._coordinates = projection([d.geometry.coordinates[0], d.geometry.coordinates[1]]);
                        })
                        .attr("transform", function (d) {
                            return "translate(" + d._coordinates[0] + "," + d._coordinates[1] + ")";
                        })
                        .attr("font-size", "2px")
                        .style("color", "black")
                        .style("pointer-events", "none")
                        .text(function (d) {
                            var label = d.properties.dist.split(" ");
                            //console.log(label);
                            return label[0];
                        });

                    if (global.selectedDistrict.length > 0) {
                        distLabels.style("opacity", opacity);
                        global.selectedDistrict.map(function (a) {
                            //console.log(a);
                            d3.selectAll(".district-" + a.key.toLowerCase().replaceAll('[ ]', "-")).style("opacity", 1);
                        });
                    }

                    //console.log(distLabels);




                    /*d3.selectAll(".district").each(function () {
                        var elementD = d3.select(this);
                        console.log(elementD);
                        elementD.append("text")
                            .attr("class", "label")
                            .attr("dx", function (d) {
                                console.log(d);
                                return "0em";//d.properties.centroid[1];
                            })
                            .attr("dy", function (d) {
                                console.log(d);
                                return "0em";//d.properties.centroid[0];
                            })
                            .attr("font-size", "18px")
                            .style("color", "black")
                            // .style("pointer-events", "none")
                            .text(function (d) {
                                var label = d.properties.dist.split(" ");
                                //console.log(label);
                                return label[0];
                            });
                    });*/




                    /*var distLabels = ugandaPath;
                    distLabels
                        .enter().append("text")
                        .attr("class", "label")
                        .each(function (d) {
                            //console.log(d);
                            d.properties.centroid = projection(d3.geo.centroid(d));
                        })
                        .attr("transform", function (d) {
                            return "translate(" + d.properties.centroid + ")";
                        })
                        //.attr("dy", ".30em")
                        .style("color", "black")
                        .style("font-size", "2px")
                        .text(function (d) {
                            var firstWords = [];
                            var label = d.properties.dist.split(" ");
                            //console.log(label);
                            return label[0];
                        });*/


                });
        }

        function reset() {

            active.classed("active", false);
            active = d3.select(null);

            svg.transition()
                .duration(900)
                .call(zoom.translate([0, 0]).scale(1).event)
                .each("start", function () {
                    svg.selectAll("text").each(function () {
                        var element = d3.select(this);
                        element.remove();
                    });

                });

            //d3.selectAll(".label").style("opacity","0");
            basemap.addTo(map);
            /*svg.selectAll("text").each(function() {
                var labels = d3.select(this);
                console.log(labels);
                //labels.remove();
            });*/
            //d3.selectAll(".label").data([]).exit().remove() ;
            //var labels = g.text;//d3.selectAll(".label");
            /*for (var i = 0; i < labels.length; i++) {
                for (var j = 0; j < labels.length; j++) {
                    labels[i].parentElement.removeChild(labels[j]);
                }
            }*/
            //var settle = svg.selectAll(".settlement");
            //console.log(settle);
            //labels.selectAll(".label").remove();

        }

        function zoomed() {
            //tooltip.classed("d3-hide", true);
            g.style("stroke-width", 1.5 / d3.event.scale + "px");
            g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            svg.selectAll(".Tag1").each(function () {
                var element = d3.select(this);
                var t = d3.transform(element.attr("transform"));
                element.attr("transform", "translate(" + t.translate + ")rotate(-90)scale(" + 1.1 / d3.event.scale + ")");

            })
            svg.selectAll(".Tag2").each(function () {
                var element = d3.select(this);
                var t = d3.transform(element.attr("transform"));
                element.attr("transform", "translate(" + t.translate + ")rotate(-90)scale(" + 1.1 / d3.event.scale + ")");

            })
            svg.selectAll(".Tag3").each(function () {
                var element = d3.select(this);//.select('path');
                // console.log(element);
                var t = d3.transform(element.attr("transform"));
                element.attr("transform", "translate(" + t.translate + ")rotate(-90)scale(" + 1.1 / d3.event.scale + ")");

                // var elementLabel = d3.select(this).select('label');
                // elementLabel.style("font-size", "500px");


            })


            /* console.log(settlements);
             console.log(ugandaPath);*/

            /*var labels = svg.selectAll(".label");
            console.log(labels);*/


        }

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
        function stopped() {
            if (d3.event.defaultPrevented) d3.event.stopPropagation();
        }

        function projectPoint(x, y) {
            var point = map.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }

        /*setTimeout(function () {
            queue()
                .defer(d3.json, "./data/UgandaDistricts.unhighlighted.geojson") //dist
                .await(readyUnhighlighted);
        }, 100);

        function readyUnhighlighted(error, ugandaGeoJsonUnhighlighted) {
            if (error) {
                throw error;
            };
            ugandaGeoJsonUnhighlighted.features.map(function (d) {
                d.properties.DNAME_06 = d.properties.dist.toLowerCase().capitalize();
            });
            ugandaGeoJson.features = ugandaGeoJson.features.concat(ugandaGeoJsonUnhighlighted.features);
            updateGeoPath(ugandaGeoJson);
        }*/

    } // ready


})(d3, $, queue, window);
