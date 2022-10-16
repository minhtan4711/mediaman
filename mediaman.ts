import localForage, { key } from "localforage";
import reflectMetadata from "reflect-metadata";
import {
	classToPlain,
	plainToClassFromExist,
	Expose,
	Type,
} from "class-transformer";

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

	@Expose()
	get identifier(): string {
		return this._identifier;
	}

	set identifier(identifier: string) {
		this._identifier = identifier;
	}

	@Expose()
	get name(): string {
		return this.name;
	}

	set name(name: string) {
		this._name = name;
	}

	@Expose()
	get description(): string {
		return this._description;
	}

	set description(description: string) {
		this._description = description;
	}

	@Expose()
	get pictureLocation(): string {
		return this._pictureLocation;
	}

	set pictureLocation(pictureLocation: string) {
		this._pictureLocation = pictureLocation;
	}

	@Expose()
	get genre(): Genre {
		return this._genre;
	}

	set genre(genre: Genre) {
		this._genre = genre;
	}
}

class Book extends Media {
	private _author: string;
	private _numberOfPages: number;

	constructor(
		name: string,
		description: string,
		pictureLocation: string,
		genre: Genre,
		author: string,
		numberOfPages: number,
		identifier?: string
	) {
		super(name, description, pictureLocation, genre, identifier);
		this._numberOfPages = numberOfPages;
		this._author = author;
	}

	@Expose()
	get author(): string {
		return this._author;
	}

	set author(author: string) {
		this._author = author;
	}

	@Expose()
	@Type(() => Number)
	get numberOfPgaes(): number {
		return this._numberOfPages;
	}

	set numberOfPgaes(numberOfPages: number) {
		this._numberOfPages = numberOfPages;
	}
}

class Movie extends Media {
	private _duration: string;
	private _director: string;

	constructor(
		name: string,
		description: string,
		pictureLocation: string,
		genre: Genre,
		duration: string,
		director: string,
		identifier?: string
	) {
		super(name, description, pictureLocation, genre, identifier);
		this._duration = duration;
		this._director = director;
	}

	@Expose()
	get director(): string {
		return this._director;
	}

	set director(director: string) {
		this._director = director;
	}

	@Expose()
	get duration(): string {
		return this._duration;
	}

	set duration(duration: string) {
		this._duration = duration;
	}
}

class MediaCollection<T extends Media> {
	private _identifier: string;
	private _name: string = "";
	private _collection: ReadonlyArray<T> = [];
	private readonly _type: Function;

	constructor(type: Function, name?: string, identifier?: string) {
		this._type = type;

		if (name) {
			this._name = name;
		}

		if (identifier) {
			this._identifier = identifier;
		} else {
			this._identifier = Math.random().toString(36).substr(2, 9);
		}
	}

	@Expose()
	get identifier(): string {
		return this._identifier;
	}

	set identifier(identifier: string) {
		this._identifier = identifier;
	}

	@Expose()
	get name(): string {
		return this._name;
	}

	set name(name: string) {
		this._name = name;
	}

	@Expose()
	@Type((options) => {
		if (options) {
			return (options.newObject as MediaCollection<T>)._type;
		} else {
			throw new Error(
				"Cannot detemine the type because the options object is null or undefined"
			);
		}
	})
	get collection(): ReadonlyArray<T> {
		return this._collection;
	}

	set collection(collection: ReadonlyArray<T>) {
		this._collection = collection;
	}

	addMedia(media: Readonly<T>): void {
		if (media) {
			this._collection = this._collection.concat(media);
		}
	}

	reomveMedia(itemId: string) {
		if (itemId) {
			this._collection = this._collection.filter(
				(item) => item.identifier !== itemId
			);
		}
	}
}

interface MediaService<T extends Media> {
	loadMediaCollection(identifier: string): Promise<MediaCollection<T>>;
	saveMediaCollection(collection: Readonly<MediaCollection<T>>): Promise<void>;
	getMediaCollectionIdentifierList(): Promise<string[]>;
	removeMediaCollection(identifier: string): Promise<void>;
}

class MeidaServiceImpl<T extends Media> implements MediaService<T> {
	private readonly _store: LocalForage;

	constructor(private _type: Function) {
		console.log(`Initializing media service for ${_type.name}`);

		// each instance of the media service has its own data store:
		//github.com/localForage/localForage
		// the initialization options are described here:
		//localforage.github.io/localForage/#settings-api-config

		this._store = localForage.createInstance({
			name: "MediaMan",
			version: 1.0,
			storeName: `media-man-${_type.name}`,
			description: "MeidaMan data store",
		});
	}

	loadMediaCollection(identifier: string): Promise<MediaCollection<T>> {
		return new Promise<MediaCollection<T>>((resolve, reject) => {
			this._store
				.getItem(identifier)
				.then((value) => {
					console.log("Found the collection: ", value);
					const retrievedCollection = plainToClassFromExist<
						MediaCollection<T>,
						any
					>(new MediaCollection<T>(this._type), value);
					console.log("Retrieved collection: ", retrievedCollection);

					resolve(retrievedCollection);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	saveMediaCollection(collection: Readonly<MediaCollection<T>>): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!collection) {
				reject(new Error("The list cannot be null or undefined"));
			}

			console.log(
				`Saving media collection with the following name ${collection.name}`
			);

			// serialization class to JSON
			const serializedVersion = classToPlain(collection, {
				excludePrefixes: ["_"],
			});

			console.log("Serialized Version: ", serializedVersion);

			this._store
				.setItem(collection.identifier, serializedVersion)
				.then((value) => {
					console.log(
						`Saved the ${collection.name} collection successfully! Saved value: ${value}`
					);
					resolve();
				})
				.catch((err) => {
					console.error(`Failed to save the ${collection.name} 
					collection with identifier 
					${collection.identifier}. Error: ${err}`);
					reject(err);
				});
		});
	}

	getMediaCollectionIdentifierList(): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			this._store
				.keys()
				.then((keys) => {
					resolve(keys);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	removeMediaCollection(identifier: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!identifier || "" === identifier.trim()) {
				reject(new Error("The identifier must be provided!"));
			}
			console.log(`Removing media collection with the following 
			identifier ${identifier}`);

			this._store
				.removeItem(identifier)
				.then(() => {
					console.log(`Removed the ${identifier} collection 
					successfully!`);
					resolve();
				})
				.catch((err) => {
					console.error(`Failed to removed the ${identifier} 
					collection`);
					reject(err);
				});
		});
	}
}
