enum Genre {
	Horror = "Horror",
	Fantasic = "Fantasic",
	Thriller = "Thriller",
	Romance = "Romance",
	Fiction = "Fiction",
}

abstract class Media {
	private _identifier: string;

	protected constructor(
		private _name: string,
		private _description: string,
		private _pictureLocation: string,
		private _genre: Genre,
		identifier?: string
	) {
		if (identifier) {
			this._identifier = identifier;
		} else {
			// using uuid instead
			this._identifier = Math.random().toString(36).substr(2, 9);
		}
	}

	get identifier(): string {
		return this._identifier;
	}

	set identifier(identifier: string) {
		this._identifier = identifier;
	}

	get name(): string {
		return this.name;
	}

	set name(name: string) {
		this._name = name;
	}

	get description(): string {
		return this._description;
	}

	set description(description: string) {
		this._description = description;
	}

	get pictureLocation(): string {
		return this._pictureLocation;
	}

	set pictureLocation(pictureLocation: string) {
		this._pictureLocation = pictureLocation;
	}

	get genre(): Genre {
		return this._genre;
	}

	set genre(genre: Genre) {
		this._genre = genre;
	}
}

