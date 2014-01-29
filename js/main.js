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
			var thisMag = Math.sqrt((this.x * this.x) + (this.y * this.y));
			var thatMag = Math.sqrt((comparator.x * comparator.x) + (comparator.y * comparator.y))

			if (Math.abs(thisMag) < Math.abs(thatMag)) {
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
	e : ImgPath + "e.svg",
	o : ImgPath + "o.svg",
	k : ImgPath + "k.svg"
}

var Displace = function() {
	return {
		// Set up snap object as canvas
		canvas : Snap(),

		// Diameter of particles
		d : 0.5,

		// Space between particles by default
		s : 10,

		// Container of the grid collection, return value of grid() will be assigned
		gridCollection : new Array(),
		newGridCollection : new Array(),
		oldGridCollection : new Array(),

		shape : false,

		translationMatrix : new Snap.Matrix(),

		yCenter : false,
		xCenter : false,

		bboxCoords : false,
		bboxCenter : false,

		trueCenter : false,

		loader : document.getElementById("spinner"),

		init : function() {
			var hash = window.location.hash.substring(1);

			this.trueCenter = Point(parseInt(this.canvas.attr("width"))/2, parseInt(this.canvas.attr("height"))/2);
			this.gridCollection = this.grid();
			this.oldGridCollection = this.cloneGrid(this.gridCollection);
			this.place(Paths[hash]);
			var _this = this;

			console.log(this.canvas);

			this.canvas.shapeLoaded = new Event('shape');
			this.canvas.calculated = new Event('calculated');
			this.canvas.pushed = new Event('pushed');
			this.canvas.pulled = new Event('pulled');

			
		},

		cloneGrid : function(arr) {
			var returnArr = new Array();
			console.log(arr);
			for (var i = 0; i < arr.length; i+=1) {
				var oldPoint = arr[i];
				returnArr[i] = Point(oldPoint.attr("cx"), oldPoint.attr("cy"));
			}

			return returnArr;
		},

		pushOut : function() {
			var _this = this;
			window.addEventListener('shape', function(e) {
				_this.displace();
			});

			window.addEventListener('calculated', function(e) {
				_this.anim();
			});

			window.addEventListener('pushed', function(e) {
				window.setTimeout(function(self) {
					_this.reset();
				}, 10000, _this);
			});

			window.addEventListener('pulled', function(e) {
				window.setTimeout(function(self) {
					_this.anim();
				}, 5000, _this);
			})
		},

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

				var path;
				var shape;
				if (p.select("path")) {
					path = p.select("path").attr("d");
					shape = _this.canvas.path(path);
				} else {
					path = p.select("polygon").attr("points");
					shape = _this.canvas.polygon(path);
				}
				
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

		calculateOffset : function(vector, path, original, callback) {

			console.log(vector, original);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(50000);
			}
			vector.div(50000);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(5000);
			}
			vector.div(5000);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(500);
			}
			vector.div(500);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(50);
			}
			vector.div(50);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(5);
			}
			vector.div(5);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(1.5);
			}
			vector.div(1.5);

			while(Snap.path.isPointInside(path, vector.x + this.bboxCenter.x, vector.y + this.bboxCenter.y)) {
				vector.mult(1.05);
			}

			callback(vector);

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
				var isInsideBox = Snap.path.isPointInsideBBox(bbox, coords.x, coords.y); // Prelim check for containment in bounding box of shape
					
				if (isInsideBox) {

					var isInside = Snap.path.isPointInside(path, coords.x, coords.y); // Complex heavy lift check for path containment
					
					if(isInside){

						// Calculate the unit vector for the offset from the center position
						var vector = this.calculateUnitVector(Point(coords.x, coords.y));
						var _this = this; //cache this for use within other functions and objects
						
						this.calculateOffset(vector, path, coords, function(vector) {
							_this.newGridCollection[i] = Point(vector.x + _this.trueCenter.x, vector.y + _this.trueCenter.y)
						});
						
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
					}, 3000, mina.elastic);
				}
			}

			window.dispatchEvent(this.canvas.pushed);
		},

		reset : function() {
			console.log("move back");
			for(var i = 0; i<this.gridCollection.length; i+=1) {
				if (this.gridCollection[i] != this.oldGridCollection[i]) {
					var _this = this;
					this.gridCollection[i].animate({
						"cx" : _this.oldGridCollection[i].x,
						"cy" : _this.oldGridCollection[i].y,
					}, 3000, mina.elastic);
				}
			}

			window.dispatchEvent(this.canvas.pulled);
		}

	}
}
var Canvas = Displace();
Canvas.init();
Canvas.pushOut();