var MathHelp = {
	dist : function(a, b) {
		var distX = b.x - a.x;
		var distY = b.y - a.y;
		return Math.sqrt((distX*distX) + (distY*distY));
	},

	norm : function(a) {
		if (Math.abs(a.x) > Math.abs(a.y)) {
			return a.div(Math.abs(a.y));
		} else if (Math.abs(a.y) > Math.abs(a.x)) {
			return a.div(Math.abs(a.x));
		} else {
			return a.div(Math.abs(a.x));
		}
	}
}

var easing = function (x, t, b, c, d) {
	if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
	return c/2*((t-=2)*t*t*t*t + 2) + b;
}

var Point = function(x, y) {

	return {
		x : x,
		y : y,
		add : function(increment) {
			this.x += increment.x;
			this.y += increment.y;
		},

		sub : function(decrement) {
			this.x -= decrement.x;
			this.y -= decrement.y;
		},

		div : function(divisor) {
			this.x = this.x/divisor;
			this.y = this.y/divisor;
		},

		mult : function(factor) {
			this.x *= factor;
			this.y *= factor;
		},

		lt : function(comparator) {
			if (Math.abs(this.x) < Math.abs(comparator.x) || Math.abs(this.y) < Math.abs(comparator.y)) {
				return true;
			} else {
				return false;
			}
		}
	}
}

var ImgPath = "images/"

var Paths = {
	d : ImgPath + "d.svg",
	i : ImgPath + "i.svg",
	s : ImgPath + "s.svg",
	p : ImgPath + "p.svg",
	l : ImgPath + "l.svg",
	a : ImgPath + "a.svg",
	c : ImgPath + "c.svg",
	e : ImgPath + "e.svg"
}

var Displace = function() {
	return {
		// Set up snap object as canvas
		canvas : Snap(),

		// Diameter of particles
		d : 1,

		// Space between particles by default
		s : 10,

		// Container of the grid collection, return value of grid() will be assigned
		gridCollection : new Array(),
		newGridCollection : new Array(),

		shape : false,

		translationMatrix : new Snap.Matrix(),

		yCenter : false,
		xCenter : false,

		bboxCoords : false,
		bboxCenter : false,

		trueCenter : false,

		calculationsComplete : new Event('calculated'),
		shapeLoaded : new Event('shape'),

		loader : document.getElementById("spinner"),

		// Creates the grid of circles, returns an array containing all circles as Snap objects
		// Internal use only, probably
		grid : function() {
			var box = Point(this.s*2, this.s*2);
			var curPos = Point(0,0);
			var _this = this;
			var gridCollection = new Array();
			var i = 0;
			while(curPos.y < parseInt(_this.canvas.attr("height"))) {
				if (curPos.x < parseInt(_this.canvas.attr("width"))) {
					gridCollection[i] = _this.canvas.ellipse(curPos.x + _this.s, curPos.y + _this.s, _this.d, _this.d);
					gridCollection[i].attr({
						"fill" : "#fff",
					});
					curPos.x += _this.s*2;
					i += 1;
				} else {
					curPos.x = 0;
					curPos.y += _this.s*2;
				}
			}

			return gridCollection;
		},

		place : function(path) {
			var _this = this;
			Snap.load(path, function(p) {

				path = p.select("path").attr("d");
				var shape = _this.canvas.path(path);
				var bbox = shape.getBBox();

				var pHeight = parseInt(bbox.height);
				var pWidth = parseInt(bbox.width);
				var cHeight = parseInt(_this.canvas.attr("height"));
				var cWidth = parseInt(_this.canvas.attr("width"));

				_this.xCenter = (cWidth/2) - (pWidth/2);
				_this.yCenter = (cHeight/2) - (pHeight/2);

				_this.bboxCenter = Point(pWidth/2, pHeight/2);

				_this.bboxCoords = Point(_this.xCenter, _this.yCenter);

				shape.attr({
					transform: "translate("+_this.xCenter+", "+_this.yCenter+")",
					fill: "rgba(0,0,0,0)"
				});

				_this.translationMatrix.translate(_this.xCenter, _this.yCenter);

				_this.shape = shape;
				window.dispatchEvent(_this.canvas.shapeLoaded);
			});
			
		},

		calculateUnitVector : function(coords) {

			// Make center equal 0,0
			coords.sub(this.bboxCenter);

			// Divide both coordinates by the smaller of the two to create unit vector
			MathHelp.norm(coords);

			// return the new coordinates
			return coords;
		},

		displace : function() {
			var shape = this.shape;
			var path = shape.realPath;
			var bbox = shape.getBBox();

			// For each point in the grid collection
			for(var i = 0; i<this.gridCollection.length; i+=1) {


				var dot = this.gridCollection[i], // Current pos
					coords = Point(parseInt(dot.attr("cx")), parseInt(dot.attr("cy"))); // position of current circle
					coords.sub(this.bboxCoords);
					isInsideBox = Snap.path.isPointInsideBBox(bbox, coords.x, coords.y); // Prelim check for containment in bounding box of shape
					
				if (isInsideBox) {

					var isInside = Snap.path.isPointInside(path, coords.x, coords.y); // Complex heavy lift check for path containment
					
					if(isInside){

						// Calculate the unit vector for the offset from the center position
						var vector = this.calculateUnitVector(coords);
						var _this = this; //cache this for use within other functions and objects

						while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
							// While the point still is inside the shape, multiply it's coordinates to push it out along a radius from the center
							vector.mult(1.05);
						}

						this.newGridCollection[i] = Point(vector.x + _this.trueCenter.x, vector.y + _this.trueCenter.y)
					} else {
						this.newGridCollection[i] = this.gridCollection[i];
					}
				} else {
					this.newGridCollection[i] = this.gridCollection[i];
				}
			}

			window.dispatchEvent(this.canvas.calculated);
		},

		anim : function() {
			this.loader.className = "back";
			for(var i = 0; i<this.gridCollection.length; i+=1) {
				if (this.gridCollection[i] != this.newGridCollection[i]) {
					var _this = this;
					this.gridCollection[i].animate({
						"cx" : _this.newGridCollection[i].x,
						"cy" : _this.newGridCollection[i].y,
					}, 3000, mina.easeinout);
				}
			}
		},

		init : function() {
			var hash = window.location.hash.substring(1);

			this.trueCenter = Point(parseInt(this.canvas.attr("width"))/2, parseInt(this.canvas.attr("height"))/2);
			this.gridCollection = this.grid();
			this.place(Paths[hash]);
			var _this = this;

			console.log(this.canvas);

			this.canvas.shapeLoaded = new Event('shape');
			this.canvas.calculated = new Event('calculated');

			window.addEventListener('shape', function(e) {
				_this.displace();
			})

			window.addEventListener('calculated', function(e) {
				_this.anim();
			})
		}

	}
}
var Canvas = Displace();
Canvas.init();